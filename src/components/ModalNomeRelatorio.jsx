/**
 * @file Modal para nomear um relatório antes de salvá-lo.
 * @module components/ModalNomeRelatorio
 */
import React, { useState } from 'react';
import './ModalNomeRelatorio.css';

/**
 * Modal de diálogo para que o usuário forneça um nome antes de gerar um relatório oficial.
 * Substitui o uso de `window.prompt`, oferecendo uma experiência visual mais refinada.
 *
 * @component
 * @param {object}   props           - Propriedades do componente.
 * @param {boolean}  props.isOpen    - Controla a visibilidade do modal. Se `false`, retorna `null`.
 * @param {Function} props.onClose   - Callback chamado ao fechar sem confirmar (botão Cancelar ou X).
 * @param {Function} props.onConfirm - Callback chamado com o nome digitado ao confirmar.
 * @returns {React.ReactElement|null} O modal renderizado ou `null` se fechado.
 */
export default function ModalNomeRelatorio({ isOpen, onClose, onConfirm }) {
  const [nome, setNome] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (nome.trim()) {
      onConfirm(nome);
      setNome('');
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container card">
        <div className="modal-header">
          <h3><i className="fa-solid fa-file-pen"></i> Nomear Relatório</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body">
          <p>Dê um título para este relatório:</p>
          <input 
            type="text" 
            value={nome} 
            onChange={(e) => setNome(e.target.value)}
            placeholder="Digite o nome aqui..."
            autoFocus
          />
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-confirm" onClick={handleConfirm} disabled={!nome.trim()}>
            Gerar Relatório
          </button>
        </div>
      </div>
    </div>
  );
}