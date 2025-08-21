import dbConnect from '@/lib/mongodb';
import Role from '@/models/Role';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  await dbConnect();

  const { userId, role } = req.body;
  if (!userId || !role) return res.status(400).json({ success: false, message: 'Missing parameters' });

  try {
    let userRole = await Role.findOne({ userId });
    if (!userRole) {
      // buat role baru kalau belum ada
      userRole = await Role.create({ userId, roles: [role], activeRole: role });
    } else {
      // update roles & activeRole
      if (!userRole.roles.includes(role)) userRole.roles.push(role);
      userRole.activeRole = role;
      await userRole.save();
    }

    res.status(200).json({ success: true, activeRole: userRole.activeRole });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
