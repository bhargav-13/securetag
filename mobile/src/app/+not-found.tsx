import { useRouter } from 'expo-router';

import { Button, Empty, Screen } from '@/ui/kit';

export default function NotFound() {
  const router = useRouter();
  return (
    <Screen edges="bottom">
      <Empty icon="alert" title="Page not found" text="That screen doesn't exist.">
        <Button label="Go home" onPress={() => router.replace('/')} style={{ alignSelf: 'stretch', marginTop: 12 }} />
      </Empty>
    </Screen>
  );
}
