import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Dialog } from '../../components/blocking/Overlays';

type Step = 'permission' | 'apps' | 'level' | 'rules';

/**
 * n is fixed when setup starts (4 with the permission step, 3 without), then passed along so the
 * counter never changes mid-flow.
 */
export function useSetupSteps(screen: Step) {
  const params = useLocalSearchParams<{ n?: string; mode?: string }>();
  const total = params.n === '3' ? 3 : 4;
  const order: Step[] = total === 4 ? ['permission', 'apps', 'level', 'rules'] : ['apps', 'level', 'rules'];
  return {
    total,
    step: order.indexOf(screen) + 1,
    isFirst: order[0] === screen,
    mode: params.mode,
    /** Query string that carries the step count to the next screen. */
    carry: `n=${total}`,
  };
}

export function exitToFocus(router: ReturnType<typeof useRouter>) {
  if (router.canDismiss()) router.dismissTo('/(tabs)/focus');
  else router.replace('/(tabs)/focus');
}

/** Back from the very first step asks before leaving (flow 3.1). */
export function useLeaveSetup(isFirst: boolean) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  const back = () => {
    if (isFirst) setConfirming(true);
    else router.back();
  };

  const dialog = (
    <Dialog
      visible={confirming}
      title="Leave setup?"
      body="Your choices won't be saved."
      primary={{ label: 'Keep setting up', onPress: () => setConfirming(false) }}
      secondary={{
        label: 'Leave',
        danger: true,
        onPress: () => {
          setConfirming(false);
          exitToFocus(router);
        },
      }}
      onClose={() => setConfirming(false)}
    />
  );

  return { back, dialog };
}
