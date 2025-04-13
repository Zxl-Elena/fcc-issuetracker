const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');
const sinon = require('sinon');
const Issue = require('../models/Issue.js');

const { expect } = chai;
chai.use(chaiHttp);

suite('Post /api/issues/:project', function() {
    test('Create an issue with every field', function (done) {
        const issue = {
            issue_title: "Fix issue with user login",
            issue_text: "Users are unable to log in due to a backend error.",
            created_by: "admin",
            assigned_to: "developer",
            status_text: "In progress",
            open: true
        };
        chai.request(server)
            .post('/api/issues/post_for_all')
            .send(issue)
            .end(function (err, res) {
                assert.equal(res.status, 200);
                assert.equal(res.body.issue_title, issue.issue_title);
                assert.equal(res.body.issue_text, issue.issue_text);
                assert.equal(res.body.created_by, issue.created_by);
                assert.equal(res.body.assigned_to, issue.assigned_to);
                assert.equal(res.body.status_text, issue.status_text);
                assert.equal(res.body.open, issue.open);
                done();
            });
    });

   test('Create an issue with only required fields', function (done) {
        const issue = {
            issue_title: "Test for only required fields",
            issue_text: "There are three required fields.",
            created_by: "admin",
            open: true
        };
        chai.request(server)
            .post('/api/issues/post_for_required')
            .send(issue)
            .end(function (err, res) {
                assert.equal(res.status, 200);
                assert.equal(res.body.issue_title, issue.issue_title);
                assert.equal(res.body.issue_text, issue.issue_text);
                assert.equal(res.body.created_by, issue.created_by);
                assert.equal(res.body.open, issue.open);
                done();
            });
    });

    test('Create an issue with missing required fields', function (done) {
        const issue = {
            issue_title: "Test for only required fields",
            issue_text: "There are three required fields.",
            open: true
        };
        chai.request(server)
            .post('/api/issues/post_for_missing')
            .send(issue)
            .end(function (err, res) {
                assert.equal(res.status, 200);
                assert.deepEqual(res.body, { error: 'required field(s) missing' });
                done();
            });
    });   
});

suite('Get /api/issues/:project', function() {

    test('view issues on a project', function(done) {
        chai.request(server)
            .get('/api/issues/testproject')
            .end((err, res) => {
                try {
                    expect(err).to.be.null;
                    assert.equal(res.status, 200);
                    expect(res.body).to.be.an('array');
    
                    // 至少应该返回一个 issue，否则说明数据源有问题
                    expect(res.body.length).to.be.at.least(1);
    
                    // 每一个 issue 都应该包含这些字段
                    res.body.forEach((issue) => {
                        expect(issue).to.be.an('object');
                        expect(issue).to.have.all.keys(
                            'project',
                            '_id',
                            'issue_title',
                            'issue_text',
                            'created_by',
                            'assigned_to',
                            'status_text',
                            'created_on',
                            'updated_on',
                            'open',
                            '__v'
                        );
                    });
    
                    done();
                } catch (e) {
                    done(e);
                }
            });
    });

   test('view issues on a project with one filter', function(done) {
        chai.request(server)
            .get('/api/issues/testproject')
            .query({ open: true })
            .end((err, res) => {
                assert.equal(res.status, 200);
                expect(res.body).to.be.an('array');
                if (res.body.length > 0) {
                    res.body.forEach(issue => {
                        expect(issue.open).to.be.true;
                    })
                }
                done();
            });
    });

    test('view issues on a project with multiple filters', function(done) {
        chai.request(server)
            .get('/api/issues/testproject')
            .query({ open: false, created_by: 'Alice' })
            .end((err, res) => {
                assert.equal(res.status, 200);
                expect(res.body).to.be.an('array');
                if (res.body.length > 0) {
                    res.body.forEach(issue => {
                        expect(issue.open).to.be.false;
                        expect(issue.created_by).to.equal('Alice');
                    })
                }
                done();
            });
    });
})

suite('Put /api/issues/:project', function () {
    let stub;

    this.beforeEach(() => {
        stub = sinon.stub(Issue, 'findByIdAndUpdate');
    });

    this.afterEach(() => {
        stub.restore();
    });

    test('update one field', function(done) {
        const body = { _id: 'abc123', issue_text: 'updated issue' };

        stub.resolves({
            _id: body._id,
            issue_text: body.issue_text,
            update_on: new Date().toISOString()
        });

        chai.request(server)
            .put('/api/issues/testproject')
            .send(body)
            .end((err, res) => {
                assert.equal(res.status, 200);
                expect(res.body).to.deep.equal({
                    result: 'successfully updated', 
                    _id: body._id
                });
                done();
            });
    });

    test('update multiple fields', function(done) {
        const body = {
            _id: 'abc123',
            issue_text: 'updated issue',
            status_text: 'Resolved',
            open: false
        };

        stub.resolves({
            ...body,
            update_on: new Date().toISOString()
        });

        chai.request(server)
            .put('/api/issues/testproject')
            .send(body)
            .end((err, res) => {
                assert.equal(res.status, 200);
                expect(res.body).to.deep.equal({
                    result: 'successfully updated',
                    _id: body._id
                });
                done();
            })
    });

    test('missing _id', function(done) {
        chai.request(server)
            .put('/api/issues/testproject')
            .send({ issue_text: 'no id here' })
            .end((err, res) => {
                assert.equal(res.status, 200);
                expect(res.body).to.deep.equal({
                    error: 'missing _id'
                });
                done();
            })
    });

    test('no field to update', function(done) {
        chai.request(server)
            .put('/api/issues/testproject')
            .send({ _id: 'abc123' })
            .end((err, res) => {
                assert.equal(res.status, 200);
                expect(res.body).to.deep.equal({
                    error: 'no update field(s) sent',
                    _id: 'abc123'
                })
                done();
            })
    });

    test('issue with an invalid _id', function(done) {
        const body = { _id: 'nonexistentid', issue_text: 'something' };

        stub.resolves(null);

        chai.request(server)
            .put('/api/issues/testproject')
            .send(body)
            .end((err, res) => {
                assert.equal(res.status, 200);
                expect(res.body).to.deep.equal({
                    error: 'could not update',
                    _id: body._id
                });
                done();
            });
    });
});

suite('Delete /issues/:project', function() {
    test('delete an issue', function(done) {
        chai.request(server)
            .post('/api/issues/testproject')
            .send({
                issue_title: 'Delete Me',
                issue_text: 'This issue will be deleted',
                created_by: 'Elena'
            })
            .end((err, res) => {
                if (err) return done(err);
                assert.equal(res.status, 200);
                expect(res.body).to.have.property('_id');

                const _id = res.body._id;

                chai.request(server)
                    .delete('/api/issues/testproject')
                    .send({ _id })
                    .end((err, res) => {
                        if (err) return done(err);
                        assert.equal(res.status, 200);
                        expect(res.body).to.deep.equal({
                            result: 'successfully deleted',
                            _id
                        })
                        done();
                    });
            });
    });

    test('delete an issue with an invalid _id', function(done) {
        chai.request(server)
            .delete('/api/issues/testproject')
            .send({ _id: 'invalidid' })
            .end((err, res) => {
                assert.equal(res.status, 400);
                expect(res.body).to.deep.equal({
                    error: 'invalid _id'
                });
                done();
            })
    });

    test('delete an issue with missing _id', function(done) {
        chai.request(server)
            .delete('/api/issues/testproject')
            .send({})
            .end((err, res) => {
                assert.equal(res.status, 200);
                expect(res.body).to.deep.equal({
                    error: 'missing _id'
                })
                done();
            })
    })
})