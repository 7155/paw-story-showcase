import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, Button } from '@/components/primitives';
import { RoomQuestionDialog } from '@/features/rooms/RoomQuestionDialog';
import type { PendingRoomQuestion } from '@/features/rooms/room-question';

/** The live question remains in the transcript; this is its foreground form. */
export function PawRoomPendingQuestion({ question, onAnswer }: {
  question: PendingRoomQuestion;
  onAnswer: (value: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(true);
  return <>
    {!open && <Button onClick={() => setOpen(true)}>继续回答当前问题</Button>}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogTitle>需要你的回答</DialogTitle>
        <DialogDescription>确认这一项后，继续当前任务。</DialogDescription>
        <RoomQuestionDialog active question={{ ...question, status: 'pending' }} onSubmit={onAnswer} />
      </DialogContent>
    </Dialog>
  </>;
}
