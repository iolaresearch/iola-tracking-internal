import { useState, useCallback } from "react";

export function useConfirm() {
  const [state, setState] = useState({ open: false, title: "", message: "", resolve: null });

  const confirm = useCallback((title, message) => {
    return new Promise((resolve) => {
      setState({ open: true, title, message, resolve });
    });
  }, []);

  const handleConfirm = () => {
    state.resolve(true);
    setState(s => ({ ...s, open: false }));
  };

  const handleCancel = () => {
    state.resolve(false);
    setState(s => ({ ...s, open: false }));
  };

  return {
    confirm,
    dialogProps: {
      open: state.open,
      title: state.title,
      message: state.message,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    },
  };
}
