import type { Metadata } from 'next'
import Link from 'next/link'

import { LegalPage } from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: 'Termos de Uso',
  description: 'Condições de uso do Portal ERP Jobs para profissionais e empresas.',
  alternates: { canonical: '/termos' },
}

export default function TermsPage() {
  return <LegalPage eyebrow="Regras da plataforma" title="Termos de Uso" updated="29 de setembro de 2026" introduction={<p>Ao criar uma conta ou usar o <strong>Portal ERP Jobs</strong>, você concorda com estes termos e com a nossa <Link href="/privacidade" className="font-semibold text-blue-700 underline">Política de Privacidade</Link>.</p>} sections={[
    { title: 'Objeto', paragraphs: [<p key="a">A plataforma conecta profissionais e empresas do mercado de software e ERP. Ela oferece perfis profissionais, currículos, publicação e pesquisa de vagas, candidaturas, gestão de processos seletivos e recursos relacionados ao ecossistema Portal ERP.</p>] },
    { title: 'Conta e responsabilidades', paragraphs: [<p key="a">Você deve fornecer informações verdadeiras, manter suas credenciais confidenciais e usar a conta apenas para finalidades legítimas. Empresas são responsáveis por seus usuários, vagas, critérios e comunicações. Profissionais são responsáveis pela veracidade do currículo e das candidaturas.</p>] },
    { title: 'Uso permitido', paragraphs: [<p key="a">É proibido praticar discriminação ilícita, fraude, assédio, coleta automatizada não autorizada, exploração de vulnerabilidades, compartilhamento indevido de dados, publicação de vagas inexistentes ou qualquer uso contrário à lei e à boa-fé.</p>] },
    { title: 'Recrutamento e contratações', paragraphs: [<p key="a">O Portal ERP Jobs facilita conexões, mas não garante contratação, candidatura, remuneração, desempenho, disponibilidade de vagas ou resultado de processos seletivos. A relação de trabalho ou prestação de serviços é estabelecida diretamente entre profissional e empresa.</p>] },
    { title: 'Conteúdo e propriedade intelectual', paragraphs: [<p key="a">Você mantém a titularidade dos conteúdos que fornece e concede à plataforma a autorização necessária para armazená-los, processá-los e exibi-los conforme as funcionalidades escolhidas. Marcas, interfaces, textos editoriais e tecnologia do Portal ERP permanecem protegidos por seus respectivos direitos.</p>] },
    { title: 'Moderação, suspensão e encerramento', paragraphs: [<p key="a">Podemos remover conteúdo, restringir funcionalidades ou suspender contas em caso de risco, violação destes termos, ordem legal, fraude ou proteção de terceiros. Sempre que razoável, comunicaremos a medida e permitiremos esclarecimentos.</p>] },
    { title: 'Disponibilidade e limitações', paragraphs: [<p key="a">Buscamos manter a plataforma segura e disponível, mas podem ocorrer manutenções, falhas de terceiros ou eventos fora do nosso controle. A responsabilidade será apurada nos limites da legislação aplicável, sem excluir direitos que não possam ser renunciados.</p>] },
    { title: 'Alterações e contato', paragraphs: [<p key="a">Podemos atualizar estes termos para refletir mudanças legais ou funcionais. Alterações relevantes serão comunicadas pelos canais disponíveis. Dúvidas podem ser enviadas a <a className="font-semibold text-blue-700 underline" href="mailto:contato@portalerp.com.br">contato@portalerp.com.br</a>.</p>] },
  ]} />
}
