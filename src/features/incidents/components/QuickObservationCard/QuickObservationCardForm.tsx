import { Form } from '@/components/ui/form';
import { QuickObservationCardFormPhotos } from './QuickObservationCardFormPhotos';
import { QuickObservationCardFormDetails } from './QuickObservationCardFormDetails';
import { QuickObservationCardFormRecognition } from './QuickObservationCardFormRecognition';
import { QuickObservationCardFormLocation } from './QuickObservationCardFormLocation';
import { QuickObservationCardFormFooter } from './QuickObservationCardFormFooter';

export function QuickObservationCardForm({ state, form, onSubmit }: any) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <QuickObservationCardFormPhotos photos={state.photos} removePhoto={state.removePhoto} handlePhotoCapture={state.handlePhotoCapture} />
        <QuickObservationCardFormDetails state={state} form={form} />
        <QuickObservationCardFormRecognition state={state} form={form} />
        <QuickObservationCardFormLocation state={state} form={form} />
        <QuickObservationCardFormFooter state={state} form={form} />
      </form>
    </Form>
  );
}
