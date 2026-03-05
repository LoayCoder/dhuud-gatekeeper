export interface PushSubscriptionState {
    isSubscribed: boolean;
    isSupported: boolean;
    isLoading: boolean;
    error: string | null;
    subscription: PushSubscription | null;
}
