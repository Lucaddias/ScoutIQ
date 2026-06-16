/**
 * @file Configuração global do Yup com mensagens de validação em português.
 * @module utils/yupConfig
 * @description Sobrescreve o locale padrão do Yup com mensagens de erro amigáveis
 * em PT-BR. Deve ser importado antes de qualquer schema de validação para que
 * as mensagens sejam aplicadas globalmente em toda a aplicação.
 *
 * @example
 * import yup from '../../utils/yupConfig.js';
 * const schema = yup.object().shape({ nome: yup.string().required() });
 */
import * as yup from 'yup';

yup.setLocale({
  mixed: {
    default: 'Campo inválido',
    required: 'Campo obrigatório',
    notType: 'Formato inválido',
  },
  string: {
    email: 'E-mail inválido',
    min: 'Deve ter pelo menos ${min} caracteres',
    max: 'Deve ter no máximo ${max} caracteres',
  },
  number: {
    min: 'Deve ser no mínimo ${min}',
    max: 'Deve ser no máximo ${max}',
  }
});

export default yup;
