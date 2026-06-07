import type { useRouter } from 'expo-router';

type Router = ReturnType<typeof useRouter>;

export function goBackOrReplace(
  router: Pick<Router, 'back' | 'canGoBack' | 'replace'>,
  fallback: Parameters<Router['replace']>[0]
) {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallback);
}
