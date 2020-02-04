/*
*
*
*       FILL IN EACH FUNCTIONAL TEST BELOW COMPLETELY
*       -----[Keep the tests in the same order!]-----
*       (if additional are added, keep them at the very end!)
*/

/* jshint node: true, asi : true, esversion : 6 */

var chaiHttp = require('chai-http');
var chai = require('chai');
var assert = chai.assert;
var server = require('../server');

chai.use(chaiHttp);

var threadId1, threadId2, replyId1;

suite('Functional Tests', function() {

  suite('API ROUTING FOR /api/threads/:board', function() {
    suite('POST', function() {
/*       before(function() {
        this.skip();
      }); */
      test('Post a thread', function(done) {
        chai.request(server)
         .post('/api/threads/test')
         .send({
           text: 'Test thread',
           delete_password: 'mYsEcReT',
         })
         .end(function(err, res){
           assert.equal(res.status, 200);
           assert.property(res.body, '_id');
           assert.property(res.body, 'created_on');
           assert.property(res.body, 'bumped_on');
           assert.property(res.body, 'replies');
           assert.equal(res.body.text, 'Test thread');
           assert.equal(res.body.delete_password, 'mYsEcReT');
           assert.isArray(res.body.replies);
           assert.equal(res.body.replies.length, 0);
           assert.approximately(new Date(res.body.created_on).getTime(), new Date().getTime(), 300, "Not updated now")
           assert.approximately(new Date(res.body.bumped_on).getTime(), new Date().getTime(), 300, "Not bumped now")
           threadId1=res.body._id;
         });
         chai.request(server)
         .post('/api/threads/test')
         .send({
           text: 'Test thread',
           delete_password: 'mYsEcReT',
         })
         .end(function(err, res){
           threadId2=res.body._id;
           done();
         });
       });
      
    });
    
    suite('GET', function() {
      test('thread ', function(done) {
        chai.request(server)
         .get('/api/threads/test')
         .end(function(err, res){
           assert.equal(res.status, 200);
           assert.isArray(res.body);
           const found = res.body.find(element => element._id == threadId1);
           assert.notEqual(found,undefined);
           assert.isNotOk(found.hasOwnProperty('delete_password'),"does not retrieve password");
           assert.isNotOk(found.hasOwnProperty('reported'),"does not retrieve reported");
           done();
         });
       });
    });
    
    suite('DELETE', function() {
      test('Incorrect password ', function(done) {
        chai.request(server)
         .delete('/api/threads/test')
         .send({
           thread_id: threadId1,
           delete_password: 'badSecret',
         })
         .end(function(err, res){
           assert.equal(res.status, 200);
           assert.property(res, 'text');
           assert.equal(res.text, 'incorrect password');
           done();
         });
       });
      test('Correct password ', function(done) {
        chai.request(server)
         .delete('/api/threads/test')
         .send({
           thread_id: threadId1,
           delete_password: 'mYsEcReT',
         })
         .end(function(err, res){
           assert.equal(res.status, 200);
           assert.property(res, 'text');
           assert.equal(res.text, 'success');
           done();
         });
       });
       test('Bad Thread', function(done) {
        chai.request(server)
         .delete('/api/threads/test')
         .send({
           thread_id: threadId1,
           delete_password: 'mYsEcReT',
         })
         .end(function(err, res){
           assert.equal(res.status, 404);
           assert.property(res, 'text');
           assert.equal(res.text, 'Unknown thread');
           done();
         });
       });
    });
    
    suite('PUT', function() {
      test('puts reported ', function(done) {
        chai.request(server)
         .put('/api/threads/test')
         .send({
           thread_id: threadId2,
         })
         .end(function(err, res){
           assert.equal(res.status, 200);
           assert.property(res, 'text');
           assert.equal(res.text, 'success');
           done();
         });
       });
       test('Bad Thread', function(done) {
        chai.request(server)
         .put('/api/threads/test')
         .send({
           thread_id: threadId1,
         })
         .end(function(err, res){
           assert.equal(res.status, 404);
           assert.property(res, 'text');
           assert.equal(res.text, 'Unknown thread');
           done();
         });
       });
    });
  });
  
  suite('API ROUTING FOR /api/replies/:board', function() {

     suite('POST', function() {

       test('Post a reply', function(done) {
         chai.request(server)
          .post('/api/replies/test')
          .send({
            text: 'Test reply',
            delete_password: 'mYsEcReTrEpLy', 
            thread_id: threadId2,
          })
          .end(function(err, res){
            assert.equal(res.status, 200);
            replyId1=res.body._id;
            done();
          });
        });
       
     });
     
     suite('GET', function() {
       test('reply ', function(done) {
         chai.request(server)
          .get('/api/replies/test?thread_id='+threadId2)
          .end(function(err, res){
            assert.equal(res.status, 200);
            assert.isArray(res.body);
            const found = res.body.find(element => element._id == threadId2);
            assert.notEqual(found,undefined);
            assert.isNotOk(found.hasOwnProperty('delete_password'),"does not retrieve password");
            assert.isNotOk(found.hasOwnProperty('reported'),"does not retrieve reported");
            done();
          });
        });
     });
     
     suite('DELETE', function() {
       test('Incorrect password ', function(done) {
         chai.request(server)
          .delete('/api/replies/test')
          .send({
            thread_id: threadId2,
            reply_id: replyId1,
            delete_password: 'badSecret',
          })
          .end(function(err, res){
            assert.equal(res.status, 200);
            assert.property(res, 'text');
            assert.equal(res.text, 'incorrect password');
            done();
          });
        });
       test('Correct password ', function(done) {
         chai.request(server)
          .delete('/api/replies/test')
          .send({
            reply_id: replyId1,
            thread_id: threadId2,
            delete_password: 'mYsEcReTrEpLy',
          })
          .end(function(err, res){
            assert.equal(res.status, 200);
            assert.property(res, 'text');
            assert.equal(res.text, 'success');
            done();
          });
        });
        test('Bad reply', function(done) {
         chai.request(server)
          .delete('/api/replies/test')
          .send({
            reply_id: threadId2,
            thread_id: threadId2,
            delete_password: 'mYsEcReTrEpLy',
          })
          .end(function(err, res){
            assert.equal(res.status, 404);
            assert.property(res, 'text');
            assert.equal(res.text, 'Unknown reply');
            done();
          });
        });
     });
     
     suite('PUT', function() {
       test('puts reported ', function(done) {
         chai.request(server)
          .put('/api/replies/test')
          .send({
            reply_id: replyId1,
            thread_id: threadId2,
          })
          .end(function(err, res){
            assert.equal(res.status, 200);
            assert.property(res, 'text');
            assert.equal(res.text, 'success');
            done();
          });
        });
        test('Bad reply', function(done) {
         chai.request(server)
          .put('/api/replies/test')
          .send({
            thread_id: threadId2,
            reply_id: threadId2,
          })
          .end(function(err, res){
            assert.equal(res.status, 404);
            assert.property(res, 'text');
            assert.equal(res.text, 'Unknown reply');
            done();
          });
        });

       test('houseKeping', function(done){
          chai.request(server)
          .delete('/api/threads/test')
          .send({
            thread_id: threadId2,
            delete_password: 'mYsEcReT',
          })
          .end(function(err, res) {
            assert.ok(true, 'cleaned');
            done();
          });
         })  
       
     });
     
  });
});
