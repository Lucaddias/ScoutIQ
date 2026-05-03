import React, { useState } from 'react';
import './ModalNomeRelatorio.css';

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