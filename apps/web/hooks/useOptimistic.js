import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUiStore } from "../store/uiStore";

export function useOptimisticMutation({ queryKey, mutationFn, updateFn, rollbackFn }) {
  const queryClient = useQueryClient();
  const showToast = useUiStore((state) => state.showToast);

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);

      if (updateFn) {
        queryClient.setQueryData(queryKey, (current) => updateFn(current, variables));
      }

      showToast({ message: "Saving...", variant: "info" }, 0);

      return { previous };
    },
    onSuccess: (data, variables) => {
      if (updateFn) {
        queryClient.setQueryData(queryKey, (current) => updateFn(current, variables, data));
      } else if (data !== undefined) {
        queryClient.setQueryData(queryKey, data);
      }

      showToast({ message: "Saved ✓", variant: "success" }, 2000);
    },
    onError: (error, variables, context) => {
      if (rollbackFn) {
        queryClient.setQueryData(queryKey, rollbackFn(context?.previous, variables, context));
      } else if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKey, context.previous);
      }

      console.error(error);
      showToast({ message: "Failed — changes reverted", variant: "error" }, 4000);
    }
  });
}
