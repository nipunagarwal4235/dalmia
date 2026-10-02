export const roles = ['super_admin', 'admin', 'manufacturer', 'retailer', 'wholesaler', 'dealer', 'customer'] as const;
export type AppRole = typeof roles[number];
export type AccessContext = {id:string; displayName:string; company:string; active:boolean; roles:AppRole[]; permissions:string[]};
export const roleLabel = (role:string) => role.split('_').map(word => word[0].toUpperCase()+word.slice(1)).join(' ');
export const can = (access:AccessContext|null, permission:string) => !!access?.active && access.permissions.includes(permission);
