'use client';

import { useEffect, useState } from 'react';
import { demoFetch as fetch } from '@/lib/demo-store';
import { AIWorkflowInsight } from './ai-workflow-insight';
import { CommunicationCenter } from './communication-center';
import { RefillDetail } from './refill-detail';

type Props = { id: string };

export function RefillWorkspace({ id }: Props) {
  const [state, setState] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    fetch(`/api/refills/${id}`).then(response => response.json()).then(body => setState(body.data?.state ?? '')).catch(() => setState(''));
  }, [id, version]);

  return <>{state && <><AIWorkflowInsight refillId={id} currentState={state} onActionComplete={async () => setVersion(current => current + 1)} /><CommunicationCenter refillId={id} onComplete={async () => setVersion(current => current + 1)} /></>}<RefillDetail key={version} id={id} /></>;
}
