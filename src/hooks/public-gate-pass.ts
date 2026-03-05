export function usePublicGatePassRequest() { return { mutateAsync: async (d: any) => d, isPending: false } as any; }
export function usePublicGatePassStatus(_id: string | undefined) { return { data: null, isLoading: false, error: null }; }
export function usePublicGatePassLookup() { return { mutateAsync: async (d: any) => d, isPending: false } as any; }
