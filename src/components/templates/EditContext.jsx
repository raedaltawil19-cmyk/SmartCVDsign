import { createContext, useContext } from "react";

const EditContext = createContext({ activateEdit: () => {} });

export const EditProvider = EditContext.Provider;
export const useEditContext = () => useContext(EditContext);