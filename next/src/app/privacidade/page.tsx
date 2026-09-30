import type { Metadata } from 'next'
import Link from 'next/link'

import { LegalPage } from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description: 'Saiba como o Portal ERP Jobs trata dados pessoais de candidatos e empresas.',
  alternates: { canonical: '/privacidade' },
}

export default function PrivacyPage() {
  return <LegalPage eyebrow="Privacidade e LGPD" title="Política de Privacidade" updated="29 de setembro de 2026" introduction={<p>Esta política explica como o <strong>Portal ERP Jobs</strong>, iniciativa do ecossistema Portal ERP, trata dados pessoais de profissionais e representantes de empresas durante cadastro, recrutamento e uso da plataforma.</p>} sections={[
    { title: 'Dados que tratamos', paragraphs: [<p key="a">Recebemos os dados informados por você, como nome, e-mail, telefone, localização, histórico profissional, formação, competências, currículo, dados empresariais e informações de vagas. Também processamos dados técnicos mínimos de acesso e segurança, como endereço IP em formato reduzido, identificadores de sessão e navegador.</p>] },
    { title: 'Finalidades e bases de tratamento', paragraphs: [<p key="a">Usamos esses dados para criar e proteger contas, publicar vagas, viabilizar candidaturas, apresentar profissionais que tenham optado pela descoberta empresarial, operar comunicações essenciais, prevenir fraude, manter auditoria e cumprir obrigações legais. O tratamento se apoia na execução dos serviços solicitados, em legítimos interesses compatíveis, no cumprimento de obrigações e, quando aplicável, no consentimento.</p>] },
    { title: 'Visibilidade entre candidatos e empresas', paragraphs: [<p key="a">Empresas aprovadas podem acessar os dados de candidatos que se candidataram às suas vagas. A descoberta proativa só apresenta profissionais que habilitaram essa visibilidade. Informações de currículo não são publicadas livremente na web nem indexadas por buscadores.</p>] },
    { title: 'Compartilhamento e operadores', paragraphs: [<p key="a">Não vendemos dados pessoais. Podemos usar fornecedores de infraestrutura, segurança e comunicação estritamente para operar a plataforma, sujeitos a controles contratuais e técnicos. Dados podem ser fornecidos a autoridades quando houver obrigação legal.</p>] },
    { title: 'Retenção e segurança', paragraphs: [<p key="a">Mantemos dados durante a relação com a plataforma e pelo período necessário para segurança, exercício de direitos e obrigações legais. Aplicamos controles de acesso por papel, sessões revogáveis, escopo regional, conexão HTTPS, backups e trilhas de auditoria. Nenhuma medida elimina completamente riscos, por isso revisamos continuamente os controles.</p>] },
    { title: 'Cookies', paragraphs: [<p key="a">A área autenticada usa cookies essenciais de sessão, proteção CSRF e preferências técnicas. Eles são necessários para login e segurança. A plataforma não depende, nesta versão, de cookies publicitários para funcionar.</p>] },
    { title: 'Seus direitos', paragraphs: [<p key="a">Você pode solicitar confirmação de tratamento, acesso, correção, portabilidade, informação sobre compartilhamento, oposição ou exclusão quando aplicável. Também pode retirar consentimentos sem comprometer tratamentos anteriores legítimos. Solicitações podem exigir verificação de identidade para proteger a conta.</p>] },
    { title: 'Contato do encarregado', paragraphs: [<p key="a">Envie solicitações de privacidade para <a className="font-semibold text-blue-700 underline" href="mailto:privacidade@portalerp.com.br">privacidade@portalerp.com.br</a>. Consulte também a <a className="font-semibold text-blue-700 underline" href="https://portalerp.com/privacidade" target="_blank" rel="noopener noreferrer">política institucional do Portal ERP</a> e os nossos <Link className="font-semibold text-blue-700 underline" href="/termos">Termos de Uso</Link>.</p>] },
  ]} />
}
