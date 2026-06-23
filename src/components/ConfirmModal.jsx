/**
 * @file Modal genérico de confirmação para ações destrutivas ou importantes.
 * @module components/ConfirmModal
 */
import React from 'react';
import './ConfirmModal.css';

/**
 * Modal de confirmação reutilizável.
 * Substitui o uso de `window.confirm` para uma UX mais consistente e acessível.
 *
 * @component
 * @param {object}   props                - Propriedades do componente.
 * @param {boolean}  props.isOpen         - Se true, renderiza o modal.
 * @param {Function} props.onClose        - Callback disparado ao cancelar ou fechar.
 * @param {Function} props.onConfirm      - Callback disparado ao confirmar.
 * @param {string}   [props.title]        - Título do modal.
 * @param {string|React.ReactNode} props.message - Mensagem principal.
 * @param {string}   [props.confirmText]  - Texto do botão de confirmar.
 * @param {string}   [props.cancelText]   - Texto do botão de cancelar.
 * @param {string}   [props.variant]      - Variante visual (danger | primary). Padrão é danger.
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmação',
  message = 'Tem certeza que deseja continuar?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger'
}) {
  if (!isOpen) return null;

  return (
    <div className="confirm-modal-overlay" onClick={onClose}>
      <div className="confirm-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className={`confirm-modal-header ${variant}`}>
          <h3>
            <i className={`fa-solid ${variant === 'danger' ? 'fa-triangle-exclamation' : 'fa-circle-question'}`}></i>
            {title}
          </h3>
          <button className="confirm-modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="confirm-modal-body">
          {message}
        </div>

        <div className="confirm-modal-footer">
          <button className="confirm-modal-btn cancel" onClick={onClose}>
            {cancelText}
          </button>
          <button className={`confirm-modal-btn ${variant}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
