export const getAvatarUrl = (fullName: string | null | undefined, avatarUrl: string | null | undefined): string => {
  if (avatarUrl) return avatarUrl;
  const name = encodeURIComponent(fullName || 'User');
  return `https://ui-avatars.com/api/?name=${name}&background=2563eb&color=fff&size=200`;
};
