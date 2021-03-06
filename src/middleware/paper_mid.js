var mysql = require('mysql');
var config = require('../../config');
var user_model = require('../models/user_model');
var user_mid = require('./user_mid');
var uuid = require('node-uuid');
var db = require('../database/db_pool');

function Paper(){
  //Determines whether a user exists,
  this.exist = function(obj, callback){
    db.getConnection(function(err, connection) {
      try{
        if (err) {throw err;}
        // Use the connection
        if (obj.username !== undefined){
          var sql = `SELECT ??,??,??,?? FROM ${config.db.database}.papers where papers_id = ?`;
          var inserts = ['papers_id','title','abstract','citation', obj.papers_id];
          sql = mysql.format(sql, inserts);
        }else{
          throw new Error('No paper id provided');
        }

        connection.query(sql, function(err, rows) {
          try{
            if (err) {throw err;}
            var paper = rows[0];
            if (paper == undefined) {throw new Error('No row data');}
            //var new_user = new user_model({user});
            //self.data = rows;
            callback('', paper); // All values have been set
            connection.release();
          }catch (err){
            //Create new object attib if no data is found

            console.log(err);
            connection.release();
            callback(err, {});
          }
        });
      }catch(err){
          console.log(err);
      }
    });
  },

  //Gets all keywords for a given paper based on paper id
  //This includes searchable keywords, and paper keywords
  this.getKeywords = function(obj, callback){
    db.getConnection(function(err, connection) {
      try{
        if (err) {throw err;}
        // Use the connection
        if (obj.papers_id !== undefined){
          var sql = `select ?? from ${config.db.database}.searchable_keywords
                      where searchable_keywords.papers_fk = ?`;
          var inserts = ['searchable_keyword', obj.papers_id];
          sql = mysql.format(sql, inserts);
        }else{
          throw new Error('No paper id provided');
        }

        connection.query(sql, function(err, rows) {
          try{
            if (err) {throw err;}
            var data = rows[0];
              var keywords = [];
              if (data == undefined) {
                //throw new Error('No row data');
              }
              rows.forEach(function(container){
                if (container == undefined) {
                  console.log('No keyword data');
                }
                keywords.push(container.searchable_keyword);
              });
              callback('', keywords);

            connection.release();
          }catch (err){
            console.log(err);
            connection.release();
            callback(err, []);
          }
        });
      }catch(err){
          console.log(err);
      }
    });
  },

  //Given a paper id this will return an array of user objects with firstname and lastname
  this.getAuthors = function(obj, callback){
    db.getConnection(function(err, connection) {
      try{
        if (err) {throw err;}
        // Use the connection
        if (obj.papers_id !== undefined){
          var sql = `select ??, ??, ?? from ${config.db.database}.users
                      inner join ${config.db.database}.papers_users_map
                      on users.users_id = papers_users_map.users_fk
                      inner join ${config.db.database}.papers
                      on papers.papers_id = papers_users_map.papers_fk
                      where papers_id = ?`;
          var inserts = ['users_id','fName','lName', obj.papers_id];
          sql = mysql.format(sql, inserts);
        }else{
          throw new Error('No paper id provided');
        }

        connection.query(sql, function(err, rows) {
          try{
            if (err) {throw err;}
            var data = rows[0];
            if (data == undefined) {throw new Error('No row data');} // Indicates there is at least one keyword
            callback('', rows);

            connection.release();
          }catch (err){
            console.log(err);
            connection.release();
            callback('', []);
          }
        });
      }catch(err){
          console.log(err);
      }
    });
  },

  // Takes an object with the following
  //Obj might contain a list of authors -> author ids,
  // and keywords -> a list of searchable_keyword
  this.createPaper = function(obj, callback){
    var data = {
      papers_id: uuid.v1(),
      title: "",
      abstract: "",
      citation : ""
    }
    obj.papers_id = data.papers_id;

    //Makes sure authors exists
    if (!obj.authors){
      obj.authors = [];
    }

    //Makes sure authors exists
    if (!obj.keywords){
      obj.keywords = [];
    }

    //Checks wheather the users_id is already an author, else add it
    if (!obj.authors.indexOf(obj.users_id) > -1){
      obj.authors.push(obj.users_id); // Adds the users_id as an author
    }

    db.getConnection(function(err, connection) {
      try{
        if (err) {throw err;}
        // Use the connection
        if (obj.title != undefined){
          data.title = obj.title;
        }
        if (obj.abstract !== undefined){
          data.abstract = obj.abstract;
        }
        if (obj.citation !== undefined){
          data.citation = obj.citation;
        }

        if (data.papers_id !== undefined){
          var sql = `insert into ${config.db.database}.papers set ?`;
        }else{
          throw new Error('No paper id provided');
        }
        connection.query(sql, data, function(err, result) {
          try{
            if (err) {throw err;}
            //if (data == undefined) {throw new Error('No row data');} // Indicates there is at least one keyword
            createPapersUsersMap(obj, callback, '');

            connection.release();
          }catch (err){
            console.log(err);
            connection.release();
            createPapersUsersMap(obj, callback, err);
          }
        });
      }catch(err){
          console.log(err);
      }
    });
  },

  //Edits a paper after authorization. Uses a papers_id
  this.editPaper = function(obj, callback){
    var data = {};
    db.getConnection(function(err, connection) {
      try{
        if (obj.title !== undefined){
          data.title = obj.title;
        }
        if (obj.abstract !== undefined){
          data.abstract = obj.abstract;
        }
        if (obj.citation !== undefined){
          data.citation = obj.citation;
        }
        console.log("adfa--------------"+data);

        var sqlParams = [];
        var sqlInserts = [];

        for (var property in data) {
          if (data.hasOwnProperty(property)) {
            sqlParams.push('??=?');
            var c = property.toString();//.replace("'"," ");
            sqlInserts.push(c);
            sqlInserts.push(data[c]);
          }
        }
        var sqlParamsString = sqlParams.join(',');
        sqlInserts.push(obj.papers_id);

        if (obj.papers_id !== undefined || sqlInserts !== undefined){
          var sql = `update ${config.db.database}.papers set ${sqlParamsString} where papers_id = ?`;
          sql = mysql.format(sql, sqlInserts);
        }else{
          throw new Error('No paper id provided');
        }

        connection.query(sql, data, function(err, result) {
          try{
            if (err) {throw err;}
            callback('', result);

            connection.release();
          }catch (err){
            console.log(err);
            connection.release();
            callback(err, '');
          }
        });
      }catch(err){
          console.log(err);
      }
    });
  },

  //Checks to see the given user has premissions for a specific paper
  //Assumes this will be in a POST Request
  //Acts as middleware for the Papers delete and updates request
  //obj need the following information
  //{
  //   users_id -> retrieved from jwt token
  //   permission -> retreved from jwt token
  //   papers_id -> retureved from client json
  // }
  this.hasPermission = function(req, res, next){
      var users_id = req.body.userId;
      var permission = req.body.permission;
      var papers_id = req.body.papers_id;

      switch(permission) {
        case "admin":
          next();
          break;
        case "faculty":
          var complete = false;
          user_mid.getPapers({users_id: users_id, permission: permission}, function(err, papers){
            if (err) {
              console.log(err);
              res.status(404).send({message: 'Paper lookup error'});
            }else{
              papers.forEach(function(paper, index, arr){
                if (paper.papers_id == papers_id){
                  next(); // User has access to the paper
                  complete = true;
                }
                if (index > arr.length-1 && complete == false){
                  res.status(404).send({message: 'Unauthorized Paper Access'}); // User does not have access to that paper
                }
              });
            }
          });
          break;
        case "student":
          res.status(401).send({message: 'Not authorized'});
          break;
        case "public":
          res.status(401).send({message: 'Not authorized'});
          break;
      }

      if (permission !== 'admin' && permission !== 'faculty' && permission !== 'student' && permission !== 'public'){
        res.status(401).send({message: 'No premissions'});
      }
  },

  //Checks if the user has paper creation permissions
  this.hasCreationPermission = function(req, res, next){
      var users_id = req.body.userId;
      var permission = req.body.permission;
      var papers_id = req.body.papers_id;
      console.log('iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii');

      switch(permission) {
        case "admin":
          next();
          break;
        case "faculty":
          next();
          break;
        case "student":
          res.status(401).send({message: 'Not authorized'});
          break;
        case "public":
          res.status(401).send({message: 'Not authorized'});
          break;
      }

      if (permission !== 'admin' && permission !== 'faculty' && permission !== 'student' && permission !== 'public'){
        res.status(401).send({message: 'No premissions'});
      }
  },
  //Deletes a paper with a given papers_id and users_id
  this.deletePaper = function(obj, callback){
    deletePapersSearchKeywords(obj, callback); // Will delete everything associated with the paper
  },

  this.deleteStrictlyKeywords = function(obj, callback){
    deleteStrictlyKeywordsPrivate(obj, callback, {});
  },

  this.addKeywords = function(obj, callback){
    addKeywordsFunction(obj, callback, '', {});
  },

  this.deleteAuthor = function(obj, callback){
    deleteAuthorFunction(obj, callback, '');
  },

  this.addAuthors = function(obj, callback){
    addAuthorsFunction(obj, callback, '', {});
  }
}

//Creates the papers users map, adds authors to a paper
// Addeds authors to a given paper, needs the following
// Obj contains users_id, existing list of authors ids, and keyword ids
// Called by createPapers
// {
//   authors : {
//     users_id
//   }
//   papers_id
// }
var createPapersUsersMap = function(obj, callback, err){
  try{
    if (err){throw err;}
    if (obj.authors.length <= 0) {throw 'Authors do not exist';}
  }catch(err){
    console.log(err);
    callback(err, '');
  }

  // Should always be one author or should err above
  author = obj.authors[0];

  db.getConnection(function(err, connection) {
    try{
      if (err) {throw err;}
      // Use the connection
      if (obj.papers_id !== undefined && author !== undefined){
        var sql = `insert into ${config.db.database}.papers_users_map set ?`;
        var post = {
          papers_fk : obj.papers_id,
          users_fk : author
        }
      }else{
        throw new Error('No paper or user id provided');
      }
      connection.query(sql, post, function(err, result2) {
        try{
          if (err) {throw err;}
          //if (data == undefined) {throw new Error('No row data');} // Indicates there is at least one keyword
          obj.authors.splice(0, 1);

          if (obj.authors.length > 0){
            createPapersUsersMap(obj, callback, err)
          }else if (obj.keywords.length > 0){
            addKeywordsFunction(obj, callback, '', result2);
          }else{
            callback('', result2);
          }

          connection.release();
        }catch (err){
          console.log(err);
          connection.release();
          if (obj.authors.length > 0){
            createPapersUsersMap(obj, callback, err)
          }else if (obj.keywords.length > 0){
            addKeywordsFunction(obj, callback, '', result2);
          }else{
            callback('', result2);
          }
        }
      });
    }catch(err){
        console.log(err);
    }
  });
};

//Creates the papers users map
// Obj contains users_id, existing authors ids, and keyword ids, papers_id
// Called by createPapersUsersMap and this
var addKeywordsFunction = function(obj, callback, err, result){
    if (err) {throw err;}
    if (obj.keywords.length <= 0) {
      callback('Keywords does not exist', result);
    }else{

      //Populate result if nothing is there
      if (!result){
        result = {};
      }
      //Sets affectedRows to 0 if nothing is there
      if (!result.affectedRows){
        result.affectedRows = 0;
      }
      //Sets preResult to distinquise from result
      var preResult = result;

      //Always taking from index 0;
      keyword = obj.keywords[0];
      db.getConnection(function(err, connection) {
        try{
          if (obj.keywords !== undefined){

            if (obj.papers_id !== undefined){
              var sql = `insert ${config.db.database}.searchable_keywords
                        (searchable_keywords_id, papers_fk, searchable_keyword)
                        values (?,?,?)`;
              sql = mysql.format(sql, [uuid.v1(), obj.papers_id, keyword]);
            }else{
              throw new Error('No paper id provided');
            }
          }
          connection.query(sql, function(err, result2) {
            try{
              if (err) {throw err;}
              //Remove keyword from array at index 0

              result2.affectedRows += preResult.affectedRows;

              obj.keywords.splice(0, 1);
              if (obj.keywords.length <= 0){
                callback('', result2);
              }else{
                addKeywordsFunction(obj, callback, '', result2);
              }

              connection.release();
            }catch (err){
              console.log(err);
              connection.release();
              callback('', result2);
            }
          });
        }catch(err){
            console.log(err);
        }
      });
    }
};



//Deletes given paper_id paper, 3th
var deletePaperFunction = function(obj, callback, err){
  try{
    if (err){throw err;}
  }catch(err){
    console.log(err);
    callback(err, '');
  }
  db.getConnection(function(err, connection, err) {
    try{
      if (err) {throw err;}

      if (obj.papers_id !== undefined){
        var sql = `delete from ${config.db.database}.papers where ?? = ?`;
        var inserts = ['papers_id', obj.papers_id];
        sql = mysql.format(sql, inserts);
      }else{
        throw new Error('No paper id provided');
      }

      connection.query(sql, function(err, result2) {
        try{
          if (err) {throw err;}
          //if (data == undefined) {throw new Error('No row data');} // Indicates there is at least one keyword
          callback('', result2);

          connection.release();
        }catch (err){
          console.log(err);
          connection.release();
          callback(err, '');
        }
      });
    }catch(err){
        console.log(err);
    }
  });
}

//Creates the papers users map
// Obj contains users_id, existing authors ids, and keyword ids, papers_id
// Called by createPapersUsersMap and this
var addAuthorsFunction = function(obj, callback, err, result){
    if (err) {throw err;}
    console.log(obj.authors);
    if (obj.authors.length <= 0) {
      callback('Authors does not exist', result);
    }else{

      //Populate result if nothing is there
      if (!result){
        result = {};
      }
      //Sets affectedRows to 0 if nothing is there
      if (!result.affectedRows){
        result.affectedRows = 0;
      }
      //Sets preResult to distinquise from result
      var preResult = result;

      //Always taking from index 0;
      author = obj.authors[0];
      db.getConnection(function(err, connection) {
        try{
          if (obj.authors !== undefined){

            if (obj.papers_id !== undefined && author !== undefined){
              var sql = `insert ${config.db.database}.papers_users_map
                        (papers_fk, users_fk)
                        values (?,?)`;
              sql = mysql.format(sql, [obj.papers_id, author]);
            }else{
              throw new Error('No papers_id or authors_id provided');
            }
          }
          connection.query(sql, function(err, result2) {
            try{
              if (err) {throw err;}
              //Remove keyword from array at index 0
              console.log(result2);
              result2.affectedRows += preResult.affectedRows;

              obj.authors.splice(0, 1);
              if (obj.authors.length <= 0){
                callback('', result2);
              }else{
                addAuthorsFunction(obj, callback, '', result2);
              }

              connection.release();
            }catch (err){
              console.log(err);
              connection.release();
              callback('', result2);
            }
          });
        }catch(err){
            console.log(err);
        }
      });
    }
};

//Deletes given author from given paper
var deleteAuthorFunction = function(obj, callback, err){
  try{
    if (err){throw err;}
  }catch(err){
    console.log(err);
    callback(err, '');
  }

  console.log("here");

  db.getConnection(function(err, connection, err) {
    try{
      if (err) {throw err;}

      if (obj.papers_id !== undefined && obj.authors_id !== undefined){
        var sql = `delete from ${config.db.database}.papers_users_map
                  where ?? = ? && ?? = ?`;
        var inserts = ['papers_fk', obj.papers_id, 'users_fk', obj.authors_id];
        sql = mysql.format(sql, inserts);
      }else{
        throw new Error('No papers_id or authors_id provided');
      }

      connection.query(sql, function(err, result2) {
        try{
          if (err) {throw err;}
          callback('', result2);

          connection.release();
        }catch (err){
          console.log(err);
          connection.release();
          callback(err, '');
        }
      });
    }catch(err){
        console.log(err);
    }
  });
}



//Deletes the papers searchable keywords, 1st
var deletePapersSearchKeywords = function(obj, callback){
  db.getConnection(function(err, connection) {
    try{
      if (err) {throw err;}
      // Use the connection
      if (obj.papers_id !== undefined && obj.users_id !== undefined){
        var sql = `delete from ${config.db.database}.searchable_keywords
                    where searchable_keywords.papers_fk = ?`;
        var inserts = [obj.papers_id];
        sql = mysql.format(sql, inserts);
      }else{
        throw new Error('No paper or user id provided');
      }

      connection.query(sql, function(err, result) {
        try{
          if (err) {throw err;}
          //if (data == undefined) {throw new Error('No row data');} // Indicates there is at least one keyword
          deletePapersUsersMap(obj, callback, '');
          connection.release();
        }catch (err){
          console.log(err);
          connection.release();
          deletePapersUsersMap(obj, callback, err);
        }
      });
    }catch(err){
        console.log(err);
    }
  });
};


//Deletes the papers users map, 2rd
var deletePapersUsersMap = function(obj, callback, err){
  try{
    if (err){throw err;}
  }catch(err){
    console.log(err);
    deletePaperFunction(obj, callback, err);
  }
  db.getConnection(function(err, connection) {
    try{
      if (err) {throw err;}
      // Use the connection
      if (obj.papers_id !== undefined && obj.users_id !== undefined){
        var sql = `delete from ${config.db.database}.papers_users_map where ?? = ?`;
        var inserts = ['papers_fk', obj.papers_id];
        sql = mysql.format(sql, inserts);
      }else{
        throw new Error('No paper or user id provided');
      }

      connection.query(sql, function(err, result) {
        try{
          if (err) {throw err;}
          //if (data == undefined) {throw new Error('No row data');} // Indicates there is at least one keyword
          deletePaperFunction(obj, callback, '');
          connection.release();
        }catch (err){
          console.log(err);
          connection.release();
          deletePaperFunction(obj, callback, '');
        }
      });
    }catch(err){
        console.log(err);
    }
  });
};

// Deletes keywords from papers
var deleteStrictlyKeywordsPrivate = function(obj, callback, result){
  db.getConnection(function(err, connection) {
    try{
      if (err) {throw err;}
      if (obj.keywords.length <= 0) {
        console.log('Keywords do not exist');
        callback('Keywords do not exist', []);
      }else{

        //Populate result if nothing is there
        if (!result){
          result = {};
        }
        //Sets affectedRows to 0 if nothing is there
        if (!result.affectedRows){
          result.affectedRows = 0;
        }
        //Sets preResult to distinquise from result
        var preResult = result;

        var keyword = obj.keywords[0];

        if (obj.papers_id !== undefined && obj.keywords !== undefined){
          var sql = `delete from ${config.db.database}.searchable_keywords
                      where searchable_keywords.searchable_keyword = ?
                      && searchable_keywords.papers_fk = ?`;
          var inserts = [keyword, obj.papers_id];
          sql = mysql.format(sql, inserts);
        }else{
          throw new Error('No paper or user id provided');
        }

        connection.query(sql, function(err, result) {
          try{
            if (err) {throw err;}

            obj.keywords.splice(0, 1); // Removes the first index keyword

            result.affectedRows += preResult.affectedRows; // Creates sum of affected rows

            if (obj.keywords.length > 0){
              deleteStrictlyKeywordsPrivate(obj, callback, result);
            }else{
              callback('', result);
            }
            connection.release();
          }catch (err){
            console.log(err);
            connection.release();
            callback(err, result);
          }
        });
      }
    }catch(err){
        console.log(err);
    }
  });
};

//Strictly deletes just the keywords from a given paper
// list of keyword ids
// and a paper_i
// {
//   papers_id,
//   keywords = [
//     "exampleID",
//     "exampleID2"
//   ]
// }


module.exports = new Paper();
