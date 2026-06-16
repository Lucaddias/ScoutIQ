/**
 * @file Ponto de entrada principal da aplicação ScoutIQ.
 * @module main
 * @description Inicializa o React, envolve a aplicação com o Provider do Redux
 * (injetando o store global) e monta o componente raiz {@link module:App} no DOM.
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

/*
 * PROVIDER DO REDUX
 * O <Provider store={store}> envolve toda a aplicação e injeta o store global.
 * Sem ele, nenhum componente conseguiria acessar o estado via useSelector ou useDispatch.
 */
import { Provider } from 'react-redux'
import { store } from './store'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
)