const Group = require('../models/Group');
const User = require('../models/User');

// @desc    Create new group
// @route   POST /api/v1/groups
// @access  Private
exports.createGroup = async (req, res) => {
  try {
    // When using multer with multipart/form-data, field values are in req.body
    // But req.body may be empty because of how multer processes multipart/form-data
    
    // Get form fields from req.body
    const name = req.body.name;
    const description = req.body.description;
    const isPublic = req.body.isPublic === undefined ? true : req.body.isPublic === 'true';
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Group name is required'
      });
    }

    // Create group
    const group = await Group.create({
      name,
      description,
      isPublic,
      createdBy: req.user.id,
      admins: [req.user.id],
      members: [req.user.id],
      // Add this line to handle the uploaded file
      groupPic: req.file ? req.file.filename : 'default-group.png'
    });

    res.status(201).json({
      success: true,
      data: group
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create group',
      error: error.message
    });
  }
};

// @desc    Get all groups
// @route   GET /api/v1/groups
// @access  Private
// @desc    Get all groups
// @route   GET /api/v1/groups
// @access  Private
exports.getAllGroups = async (req, res) => {
  try {
    // Get all public groups and groups where user is a member
    const groups = await Group.find({
      $or: [
        { isPublic: true },
        { members: req.user.id }
      ]
    })
    .populate('createdBy', 'username profilePic')
    .populate('admins', 'username profilePic')
    .populate('members', 'username profilePic');

    res.status(200).json({
      success: true,
      count: groups.length,
      data: groups
    });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch groups',
      error: error.message
    });
  }
};

// @desc    Get group by ID
// @route   GET /api/v1/groups/:id
// @access  Private
// @desc    Get group by ID
// @route   GET /api/v1/groups/:id
// @access  Private
exports.getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('createdBy', 'username profilePic')
      .populate('admins', 'username profilePic')
      .populate('members', 'username profilePic');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user can access this group
    if (!group.isPublic && !group.members.some(member => member._id.toString() === req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this group'
      });
    }

    res.status(200).json({
      success: true,
      data: group
    });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch group',
      error: error.message
    });
  }
};

// @desc    Update group
// @route   PUT /api/v1/groups/:id
// @access  Private (group admin only)
exports.updateGroup = async (req, res) => {
  try {
    const { name, description, isPublic } = req.body;
    let group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is an admin of the group
    if (!group.admins.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this group'
      });
    }

    // Update group
    group = await Group.findByIdAndUpdate(
      req.params.id,
      { name, description, isPublic },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: group
    });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update group',
      error: error.message
    });
  }
};

// @desc    Join group
// @route   PUT /api/v1/groups/:id/join
// @access  Private
exports.joinGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if group is public or user has invite
    if (!group.isPublic && !group.invites.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'This group requires an invitation to join'
      });
    }

    // Check if user is already a member
    if (group.members.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this group'
      });
    }

    // Add user to members
    group.members.push(req.user.id);
    
    // Remove from invites if present
    if (group.invites.includes(req.user.id)) {
      group.invites = group.invites.filter(id => id.toString() !== req.user.id);
    }
    
    await group.save();

    res.status(200).json({
      success: true,
      message: 'Joined group successfully',
      data: group
    });
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join group',
      error: error.message
    });
  }
};

// @desc    Leave group
// @route   PUT /api/v1/groups/:id/leave
// @access  Private
exports.leaveGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is a member
    if (!group.members.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }

    // If user is the only admin and there are other members, return error
    if (
      group.admins.length === 1 && 
      group.admins[0].toString() === req.user.id && 
      group.members.length > 1
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please assign another admin before leaving the group'
      });
    }

    // Remove user from members and admins
    group.members = group.members.filter(id => id.toString() !== req.user.id);
    group.admins = group.admins.filter(id => id.toString() !== req.user.id);
    
    await group.save();

    res.status(200).json({
      success: true,
      message: 'Left group successfully'
    });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave group',
      error: error.message
    });
  }
};

// @desc    Add member as admin
// @route   PUT /api/v1/groups/:id/admins/:userId
// @access  Private (group admin only)
exports.addAdmin = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    const userId = req.params.userId;

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is an admin of the group
    if (!group.admins.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify admins'
      });
    }

    // Check if target user is a member
    if (!group.members.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'User must be a group member before becoming an admin'
      });
    }

    // Check if user is already an admin
    if (group.admins.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'User is already an admin'
      });
    }

    // Add user to admins
    group.admins.push(userId);
    await group.save();

    res.status(200).json({
      success: true,
      message: 'Admin added successfully',
      data: group
    });
  } catch (error) {
    console.error('Add admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add admin',
      error: error.message
    });
  }
};

// @desc    Remove member
// @route   DELETE /api/v1/groups/:id/members/:userId
// @access  Private (group admin only)
exports.removeMember = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    const userId = req.params.userId;

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is an admin of the group
    if (!group.admins.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to remove members'
      });
    }

    // Cannot remove the only admin
    if (
      group.admins.length === 1 && 
      group.admins[0].toString() === userId && 
      userId === req.user.id
    ) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove the only admin. Assign another admin first.'
      });
    }

    // Remove user from members and admins
    group.members = group.members.filter(id => id.toString() !== userId);
    group.admins = group.admins.filter(id => id.toString() !== userId);
    
    await group.save();

    res.status(200).json({
      success: true,
      message: 'Member removed successfully',
      data: group
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove member',
      error: error.message
    });
  }
};

// @desc    Delete group
// @route   DELETE /api/v1/groups/:id
// @access  Private (group creator or site admin only)
exports.deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is group creator or site admin
    if (group.createdBy.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this group'
      });
    }

    await group.deleteOne(); // Updated from remove() which is deprecated

    res.status(200).json({
      success: true,
      message: 'Group deleted successfully'
    });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete group',
      error: error.message
    });
  }
};