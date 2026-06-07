export const isOwner = (role) => role === 'super_admin' || role === 'admin';
export const isClient = (role) => role === 'viewer';
export const isTechnician = (role) => role === 'technician';
