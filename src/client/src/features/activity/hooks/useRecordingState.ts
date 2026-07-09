import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRecordingStatus,
  startRecording,
  stopRecording,
  type RecordingStatus,
} from "../api";

export function useRecordingState() {
  const qc = useQueryClient();

  const { data: status } = useQuery<RecordingStatus>({
    queryKey: ["recording", "status"],
    queryFn: getRecordingStatus,
    staleTime: 0, // always re-fetch on focus (recording state changes)
    refetchOnWindowFocus: true,
  });

  const isRecording = status?.isRecording ?? false;

  const startMutation = useMutation({
    mutationFn: startRecording,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["recording", "status"] }),
  });

  const stopMutation = useMutation({
    mutationFn: stopRecording,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["recording", "status"] }),
  });

  return {
    isRecording,
    startedAt: status?.startedAt ?? null,
    startRecording: () => startMutation.mutate(),
    stopRecording: () => stopMutation.mutate(),
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
  };
}
