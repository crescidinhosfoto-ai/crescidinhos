import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ContractPage from "./ContractPage";

const isContractPage = window.location.pathname.startsWith("/contrato/");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isContractPage ? <ContractPage /> : <App />}
  </React.StrictMode>
);
