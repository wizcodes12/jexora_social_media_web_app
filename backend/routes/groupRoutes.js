const express = require('express');
const router = express.Router();
const { 
  createGroup,
  getAllGroups,
  getGroupById,
  updateGroup,
  joinGroup,
  leaveGroup,
  addAdmin,
  removeMember,
  deleteGroup
} = require('../controllers/groupController');
const { protect } = require('../middleware/auth');
const upload = require('../utils/fileUpload'); // Make sure to import upload

// @route   POST /api/v1/groups
// @desc    Create a new group
// @access  Private
router.post('/', protect, upload.single('groupPic'), createGroup);

// @route   GET /api/v1/groups
// @desc    Get all groups the user is a member of
// @access  Private
router.get('/', protect, getAllGroups);

// @route   GET /api/v1/groups/:id
// @desc    Get group by ID
// @access  Private (only group members)
router.get('/:id', protect, getGroupById);

// @route   PUT /api/v1/groups/:id
// @desc    Update group
// @access  Private (only group admin)
router.put('/:id', protect, updateGroup);

// @route   DELETE /api/v1/groups/:id
// @desc    Delete group
// @access  Private (only group admin)
router.delete('/:id', protect, deleteGroup);

// @route   PUT /api/v1/groups/:id/join
// @desc    Join group
// @access  Private
router.put('/:id/join', protect, joinGroup);

// @route   PUT /api/v1/groups/:id/leave
// @desc    Leave group
// @access  Private
router.put('/:id/leave', protect, leaveGroup);

// @route   PUT /api/v1/groups/:id/admins/:userId
// @desc    Add member as admin
// @access  Private (only group admin)
router.put('/:id/admins/:userId', protect, addAdmin);

// @route   DELETE /api/v1/groups/:id/members/:userId
// @desc    Remove member from group
// @access  Private (group admin only)
router.delete('/:id/members/:userId', protect, removeMember);

module.exports = router;