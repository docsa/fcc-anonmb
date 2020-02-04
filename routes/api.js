/*
 *
 *
 *       Complete the API routing below
 *
 *
 */

/*jshint esversion: 6 */
var expect = require("chai").expect;
var MongoClient = require("mongodb");
var ObjectId = require("mongodb").ObjectID;

const CONNECTION_STRING = process.env.DB; //MongoClient.connect(CONNECTION_STRING, function(err, db) {});
const  projection = {
  _id: 1,
  board: 1,
  text: 1,
  created_on: 1,
  bumped_on: 1,
  replies: 1
};
var db;

MongoClient.connect(process.env.DB, (err, data) => {
  if (err) console.log("Database error: " + err);
  db = data;
  console.log("Database connected");
});

function compare( a, b ) {
  if ( a.created_on < b.created_on ){
    return 1;
  }
  if ( a.created_on > b.created_on ){
    return -1;
  }
  return 0;
}

module.exports = function(app) {
  app
    .route("/api/threads/:board")
    .get(function(req, res, next) {
      var board = req.params.board;

      db.collection("threads")
        .find({ board: board }, projection)
        .sort({ bumped_on: -1 })
        .limit(10)
        .toArray((err, data) => {
          if (err) {
            return next(err);
          } else {
            let dataMapped = data.map(e => {
              e.replycount = e.replies.length;
              e.replies=e.replies.sort(compare).slice(0,3);
              
              return e;
            });
            return res.json(dataMapped);
          }
        });
    })
    .post(function(req, res, next) {
      var board = req.params.board;

      let text = req.body.text;
      if (!text) {
        return next(new Error("missing text"));
      }
      let deletePassword = req.body.delete_password;
      if (!deletePassword) {
        return next(new Error("missing delete password"));
      }
      let now = new Date();
      let thread = {
        board: board,
        text: text,
        delete_password: deletePassword,
        replies : [],
        created_on: now,
        bumped_on: now,
        reported: false
      };

      db.collection("threads").insertOne(thread, (err, data) => {
        if (err) {
          return next(err);
        } else thread._id = data.insertedId;
        return res.json(thread);
      });
    })
    .delete(function(req, res, next){
      var board = req.params.board;
      
      let deletePassword = req.body.delete_password;
      if (!deletePassword) {
        return next(new Error("missing delete password"));
      }

      let threadId = req.body.thread_id;
      if (!threadId) {
        return next(new Error("missing thread id"));
      }
      db.collection("threads")
        .findOne( { "_id" :ObjectId(threadId) } ,(err, data) => {
          if (err) {
            return next(err);
          } else {
              if (!data) {
                res.status(404);
                return res.send('Unknown thread');
              }
              if (data.delete_password !== deletePassword) {
                return res.send("incorrect password");
              }

              db.collection("threads").remove({'$or' : [{"_id": ObjectId(threadId)},{ "thread_id" : ObjectId(threadId)}]}, (err, data) => {
                  if (err) {
                    return next(err);
                  } else {
                    return res.send("success");
                  }
          });
        }
      });
  })
  .put(function(req, res, next){
    var board = req.params.board;

    let threadId = req.body.thread_id;
    if (!threadId) {
      return next(new Error("missing thread id"));
    }
    db.collection("threads")
      .findOneAndUpdate( { "_id" :ObjectId(threadId) } ,{"$set": {"reported" : true }},(err, data) => {
        if (err) {
          return next(err);
        } else {
            if (!data.value) {
              res.status(404);
              return res.send('Unknown thread');
            } else {
                return res.send("success");
            }
        }
      });
  });

  app
    .route("/api/replies/:board")
    .get(function(req, res, next) {
      let thread_id=req.query.thread_id;
      if (!thread_id) {
        return next(new Error("missing thread_id"));
      }

      db.collection("threads")
        .find({"$or" : [{"_id": ObjectId(thread_id)}, {"thread_id" :ObjectId(thread_id)}] }, projection)
        .toArray( (err, data) => {
          if (err) {
            return next(err);
          } else {
            let dataMapped = data.map(e => {
              e.replycount = e.replies.length;
              return e;
            });
            return res.json(dataMapped);
          }
      });
    })
    .post(function(req, res, next) {
      var board = req.params.board;
    
      let thread_id = req.body.thread_id;
      if (!thread_id) {
        return next(new Error("missing thread_id"));
      }
      db.collection("threads").findOne({ _id: ObjectId(thread_id) },
        (err, original_thread) => {
          if (err) {
            return next(err);
          }
        
          if (!original_thread) {
            return next(new Error("non existent thread_id"));
          }
          let text = req.body.text;
          if (!text) {
            return next(new Error("missing text"));
          }
          let deletePassword = req.body.delete_password;
          if (!deletePassword) {
            return next(new Error("missing delete password"));
          }
          let now = new Date();
          let thread = {
            board: board,
            text: text,
            delete_password: deletePassword,
            created_on: now,
            bumped_on: now,
            reported: false,
            replies: [],
            thread_id: ObjectId(thread_id)
          };

          db.collection("threads").insertOne(thread, (err, data) => {
            if (err) {
              return next(err);
            } 

            delete thread.replies;
            delete thread.board;
            delete thread.bumped_on;
            delete thread.thread_id;
            thread._id = data.insertedId;
            original_thread.replies.push(thread);

            let updateQuery = {
              $set: { replies: original_thread.replies, bumped_on: new Date() }
            };
            db.collection("threads").updateOne( { _id: ObjectId(thread_id )}, updateQuery,( err )=> {
                if (err) {
                  return next(err);
                } else {
                  return res.json(thread);
                }
              }
            );
          });
        });
    })
    .delete(function(req, res, next){
      var board = req.params.board;
      
      let deletePassword = req.body.delete_password;
      if (!deletePassword) {
        return next(new Error("missing delete password"));
      }

      let threadId = req.body.thread_id;
      if (!threadId) {
        return next(new Error("missing thread id"));
      }

      let replyId = req.body.reply_id;
      if (!replyId) {
        return next(new Error("missing reply id"));
      }
      
      db.collection("threads")
        .findOne( { "_id" :ObjectId(threadId) }, (err, data) => {
          if (err) {
            return next(err);
          } else {
            if (!data) {
              res.status(404);
              return res.send('Unknown thread');
            }

            const found = data.replies.findIndex(element =>  (element._id.toString() == replyId) );
            if(found==-1) {
              res.status(404);
              return res.send('Unknown reply');
            }

            if (data.replies[found].delete_password !== deletePassword) {
              return res.send("incorrect password");
            }
            db.collection("threads").update({"_id": ObjectId(threadId), "replies._id" : ObjectId(replyId)},{"$set": { "replies.$.text" : "[deleted]"}}, (err, data) => {
                if (err) {
                  return next(err);
                } else {
                  return res.send("success");
                }
          });
        }
      });
  })
  .put(function(req, res, next) {
    var board = req.params.board;
    let threadId = req.body.thread_id;
    if (!threadId) {
      return next(new Error("missing thread id"));
    }

    let replyId = req.body.reply_id;
    if (!replyId) {
      return next(new Error("missing reply id"));
    }
    
    db.collection("threads")
      .findOne( { "_id" :ObjectId(threadId) }, (err, data) => {
        if (err) {
          return next(err);
        } 

        if (!data) {
          res.status(404);
          return res.send('Unknown thread');
        }

        const found = data.replies.findIndex(element =>  (element._id.toString() == replyId) );
        if(found==-1) {
          res.status(404);
          return res.send('Unknown reply');
        }

        db.collection("threads").update({"_id": ObjectId(threadId), "replies._id" : ObjectId(replyId)},{"$set": { "replies.$.reported" : true }}, (err, data) => {
          if (err) {
            return next(err);
          } else {
            return res.send("success");
          }
    });

      });
  });
};
