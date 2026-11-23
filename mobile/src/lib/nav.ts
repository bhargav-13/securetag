import { useRouter } from 'expo-router';

/** Leaves the auth screens: back to where the person came from (e.g. the tag
 *  they were activating), or home if they opened login directly. */
export function useLeaveAuth() {
  const router = useRouter();
  return () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
}
