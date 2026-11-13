import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  getKeyPeopleHidden,
  getKeyPeopleOverrides,
  subscribeKeyPeopleOverrides,
} from "../utils/storage";
import {
  getHiddenLiveIds,
  getKeyPeople,
  isKeyPeopleCustomized,
  mergeLiveKeyPeople,
} from "../utils/keyPeople";
import {
  fetchOfficeholders,
  getCountryCodeByName,
} from "../utils/officeholdersApi";

const NO_OFFICEHOLDERS = [];

function useOfficeholders(country) {
  const [state, setState] = useState({
    code: null,
    result: null,
    loading: true,
    error: null,
  });

  const load = useCallback(
    async (refresh) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const code = await getCountryCodeByName(country);
        if (!code) {
          setState({ code: null, result: null, loading: false, error: null });
          return;
        }
        const result = await fetchOfficeholders(code, { refresh });
        setState({ code, result, loading: false, error: null });
      } catch (err) {
        setState((s) => ({ ...s, loading: false, error: err.message }));
      }
    },
    [country],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  return { ...state, refresh: () => load(true) };
}

export function useKeyPeople(country) {
  const overrides = useSyncExternalStore(
    subscribeKeyPeopleOverrides,
    getKeyPeopleOverrides,
  );
  const hidden = useSyncExternalStore(
    subscribeKeyPeopleOverrides,
    getKeyPeopleHidden,
  );
  const officeholders = useOfficeholders(country);
  const customized = isKeyPeopleCustomized(country, overrides);
  const hiddenIds = getHiddenLiveIds(country, hidden);

  const { live, list } = useMemo(
    () =>
      mergeLiveKeyPeople({
        list: getKeyPeople(country, overrides),
        customized,
        officeholders: officeholders.result?.officeholders ?? NO_OFFICEHOLDERS,
        hiddenIds,
      }),
    [country, overrides, hiddenIds, customized, officeholders.result],
  );

  return {
    live,
    list,
    customized,
    hiddenCount: hiddenIds.length,
    officeholders,
  };
}
