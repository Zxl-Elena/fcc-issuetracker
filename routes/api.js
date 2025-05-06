 'use strict';
const Issue = require('../models/Issue.js');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

module.exports = function (app) {

  router.post('/issues/:project', async (req, res) => {    
    const { issue_title, issue_text, created_by, assigned_to, status_text } = req.body;
    if (!issue_title || !issue_text || !created_by) {
      return res.json({ error: 'required field(s) missing' });
    }
  
    try {
      const newIssue = new Issue({
        project: req.params.project,
        issue_title,
        issue_text,
        created_by,
        assigned_to: assigned_to || '',
        status_text: status_text || '',
      });
  
      const savedIssue = await newIssue.save();
      res.json(savedIssue);
    } catch (err) {
      console.error("❌ Error saving issue:", err);
      res.status(500).json({ error: 'Server error', details: err.message });
    }
  });
 

  router.get('/issues/:project', async (req, res) => {
    try {
      const project = req.params.project;
      
      // 解析查询参数（req.query）
      let filter = { project, ...req.query };
  
      // 转换布尔值（因为 req.query 默认是字符串）
      Object.keys(filter).forEach(key => {
        if (filter[key] === 'true') filter[key] = true;
        if (filter[key] === 'false') filter[key] = false;
      });
  
      // 查询数据库
      const issues = await Issue.find(filter);
      
      res.json(issues);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.put('/issues/:project', async (req, res) => {
    const {_id, ...updateFields } = req.body;
    if (!_id) {
      return res.json({ error: 'missing _id' })
    }
    
    if (Object.keys(updateFields).length === 0) {
      return res.json({ error: 'no update field(s) sent', _id })
    }
    try {
      const updatedIssue = await Issue.findByIdAndUpdate(
        _id,
        { $set : {
            ...updateFields,
            updated_on: new Date()
          } 
        },
        { new: true }
      );
      if (!updatedIssue) {
        return res.json({ error: 'could not update', _id });
      }
      res.json({ result: 'successfully updated', _id });
    } catch (err) {
      res.status(500).json({ error: 'could not update', _id });
    }
  });

  router.delete('/issues/:project', async (req, res) => {
    const { _id } = req.body;  // 请求体里的 _id
  
    if (!_id) {
      return res.status(200).json({ error: 'missing _id' });  // 错误时返回 200
    }

    if (!mongoose.Types.ObjectId.isValid(_id)) {
      return res.status(400).json({ error: 'invalid _id' });
    }
  
    try {
      // 尝试删除 issue
      const deletedIssue = await Issue.findByIdAndDelete(_id);
      if (!deletedIssue) {
        return res.status(200).json({ error: 'could not delete', _id });
      }
  
      // 成功删除
      res.status(200).json({ result: 'successfully deleted', _id });
    } catch (err) {
      // 捕获错误，返回 200 和错误信息
      console.error(err);  // 打印错误
      res.status(200).json({ error: 'could not delete', _id });
    }
  });
  app.use('/api', router);
};
