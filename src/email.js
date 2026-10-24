// Envio de e-mail pela API da Resend (resend.com).
//
// Variáveis de ambiente:
//   RESEND_API_KEY   chave da API (obrigatória para enviar de verdade)
//   EMAIL_REMETENTE  ex: "PixelRadar <nao-responda@seudominio.com.br>"
//
// ATENÇÃO: o remetente padrão (onboarding@resend.dev) é de TESTE e só entrega
// para o e-mail da própria conta Resend. Para enviar para qualquer usuário é
// preciso verificar um domínio seu no painel da Resend e usar um remetente
// desse domínio em EMAIL_REMETENTE.

const REMETENTE_PADRAO = 'PixelRadar <onboarding@resend.dev>';

async function enviarEmail({ para, assunto, html }) {
  const chave = process.env.RESEND_API_KEY;
  if (!chave) {
    console.error('E-mail não enviado: RESEND_API_KEY não está configurada.');
    return false;
  }

  try {
    const resposta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${chave}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.EMAIL_REMETENTE || REMETENTE_PADRAO,
        to: para,
        subject: assunto,
        html
      })
    });

    if (!resposta.ok) {
      // O corpo da resposta explica o motivo (ex: domínio não verificado).
      // Não contém dados do usuário, então é seguro registrar nos logs.
      const detalhe = await resposta.text().catch(() => '');
      console.error(`Resend recusou o envio (HTTP ${resposta.status}): ${detalhe}`);
      return false;
    }
    return true;
  } catch (erro) {
    console.error('Falha ao chamar a API de e-mail:', erro.message);
    return false;
  }
}

function caixaDoCodigo(codigo) {
  return (
    '<p style="font-size:30px;letter-spacing:8px;font-weight:700;margin:18px 0;' +
    'font-family:monospace;">' + codigo + '</p>'
  );
}

// Código para redefinir a senha (esqueci minha senha)
function enviarCodigoRedefinicaoSenha(para, codigo) {
  return enviarEmail({
    para,
    assunto: 'Seu código para redefinir a senha no PixelRadar',
    html:
      '<p>Alguém pediu para redefinir a senha da sua conta no PixelRadar. Use este código:</p>' +
      caixaDoCodigo(codigo) +
      '<p>Ele vale por 15 minutos e só pode ser usado uma vez.</p>' +
      '<p>Se não foi você, ignore este e-mail: sua senha continua a mesma.</p>'
  });
}

// Código para confirmar um novo e-mail (enviado para o NOVO endereço)
function enviarCodigoNovoEmail(para, codigo) {
  return enviarEmail({
    para,
    assunto: 'Confirme seu novo e-mail no PixelRadar',
    html:
      '<p>Você pediu para usar este endereço na sua conta do PixelRadar. Digite este código para confirmar:</p>' +
      caixaDoCodigo(codigo) +
      '<p>Ele vale por 15 minutos.</p>' +
      '<p>Se não foi você, ignore este e-mail: nada será alterado.</p>'
  });
}

// Aviso de segurança para o e-mail ANTIGO depois que a troca foi concluída
function enviarAvisoEmailAlterado(para) {
  return enviarEmail({
    para,
    assunto: 'O e-mail da sua conta no PixelRadar foi alterado',
    html:
      '<p>O e-mail da sua conta no PixelRadar acabou de ser alterado para outro endereço.</p>' +
      '<p>Se foi você, não precisa fazer nada. Se não foi, entre em contato com a gente o quanto antes.</p>'
  });
}

module.exports = {
  enviarCodigoRedefinicaoSenha,
  enviarCodigoNovoEmail,
  enviarAvisoEmailAlterado
};
