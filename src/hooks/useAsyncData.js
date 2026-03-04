import { useEffect, useState } from 'react';

export function useAsyncData(asyncFn, deps = []) {
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    let active = true;

    async function run() {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const data = await asyncFn();
        if (!active) {
          return;
        }

        setState({
          data,
          loading: false,
          error: null
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setState({
          data: null,
          loading: false,
          error: error?.message || '请求失败'
        });
      }
    }

    run();

    return () => {
      active = false;
    };
  }, deps);

  return state;
}
