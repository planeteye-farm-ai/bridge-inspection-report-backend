import bcrypt from 'bcryptjs';
import { recordAuditLog } from '../services/auditService.js';
import { assignRole, createUser, deleteUser, listUsers, updateUser } from '../services/userService.js';

export const getUsers = async (req, res) => {
  try {
    const users = await listUsers({
      search: req.query.q,
      status: req.query.status,
      role: req.query.role,
      limit: Number(req.query.limit) || 25,
      offset: Number(req.query.offset) || 0,
    });
    res.json({ success: true, data: users });
  } catch (err) {
    console.error('[USER_CONTROLLER] Error in getUsers:', err);
    throw err;
  }
};

export const createUserController = async (req, res) => {
  try {
    const { name, email, password, role, status = 'active' } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({ name, email: email.toLowerCase(), passwordHash, role, status });
    await recordAuditLog({
      actorId: req.user.id,
      action: 'create_user',
      entity: 'user',
      entityId: user.id,
    });

    res.status(201).json({ success: true, data: user });
  } catch (err) {
    console.error('[USER_CONTROLLER] Error in createUserController:', err);
    throw err;
  }
};

export const updateUserController = async (req, res) => {
  try {
    const payload = {
      name: req.body.name,
      status: req.body.status,
      role: req.body.role,
    };
    const user = await updateUser(req.params.id, payload);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found or no changes' });
    }

    await recordAuditLog({
      actorId: req.user.id,
      action: 'update_user',
      entity: 'user',
      entityId: req.params.id,
      metadata: payload,
    });

    res.json({ success: true, data: user });
  } catch (err) {
    console.error('[USER_CONTROLLER] Error in updateUserController:', err);
    throw err;
  }
};

export const deleteUserController = async (req, res) => {
  try {
    await deleteUser(req.params.id);
    await recordAuditLog({
      actorId: req.user.id,
      action: 'delete_user',
      entity: 'user',
      entityId: req.params.id,
    });
    res.json({ success: true, message: 'User removed' });
  } catch (err) {
    console.error('[USER_CONTROLLER] Error in deleteUserController:', err);
    throw err;
  }
};

export const activateUser = async (req, res) => {
  try {
    const user = await updateUser(req.params.id, { status: 'active' });
    res.json({ success: true, data: user });
  } catch (err) {
    console.error('[USER_CONTROLLER] Error in activateUser:', err);
    throw err;
  }
};

export const deactivateUser = async (req, res) => {
  try {
    const user = await updateUser(req.params.id, { status: 'inactive' });
    res.json({ success: true, data: user });
  } catch (err) {
    console.error('[USER_CONTROLLER] Error in deactivateUser:', err);
    throw err;
  }
};

export const assignUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) {
      return res.status(400).json({ success: false, error: 'Role is required' });
    }
    const user = await assignRole(req.params.id, role);
    await recordAuditLog({
      actorId: req.user.id,
      action: 'assign_role',
      entity: 'user',
      entityId: req.params.id,
      metadata: { role },
    });
    res.json({ success: true, data: user });
  } catch (err) {
    console.error('[USER_CONTROLLER] Error in assignUserRole:', err);
    throw err;
  }
};

