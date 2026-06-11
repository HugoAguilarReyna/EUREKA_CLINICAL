// src/hooks/useAnalyzeCase.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { analyzeCase } from '../services/caseService';
import { Case } from '../types/case';
import { AxiosError } from 'axios';
import { useCaseStore } from '../store/useCaseStore';

export const useAnalyzeCase = () => {
  const queryClient = useQueryClient();
  const setPrediction = useCaseStore((s) => s.setPrediction);
  const setLoading = useCaseStore((s) => s.setLoading);
  const setError = useCaseStore((s) => s.setError);

  return useMutation<
    /* success */ ReturnType<typeof analyzeCase>,
    /* error */ AxiosError,
    /* variables */ Case
  >({
    mutationFn: (payload: Case) => analyzeCase(payload),
    onMutate: () => {
      setLoading(true);
      setError(null);
    },
    onSuccess: (data) => {
      setPrediction(data);
      // React Query v5 syntax
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
    onError: (err) => {
      setError(err?.message ?? 'Error analyzing case');
    },
    onSettled: () => {
      setLoading(false);
    },
  });
};
