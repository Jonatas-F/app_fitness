import { ROUTE_PATHS } from '../router/routePaths';

export const navigationItems = [
  { label: 'Dashboard', path: ROUTE_PATHS.dashboard, icon: '🏠' },
  { label: 'Treinos', path: ROUTE_PATHS.workouts, icon: '🏋️' },
  { label: 'Dietas', path: ROUTE_PATHS.diets, icon: '🥗' },
  { label: 'Progresso', path: ROUTE_PATHS.progress, icon: '📈' },
  { label: 'Check-ins', path: ROUTE_PATHS.checkins, icon: '📝' },
  { label: 'Chat IA', path: ROUTE_PATHS.chat, icon: '💬' },
  { label: 'Perfil', path: ROUTE_PATHS.profile, icon: '👤' },
  { label: 'Configurações', path: ROUTE_PATHS.settings, icon: '⚙️' },
];

export const mobileNavigationItems = [
  { shortLabel: 'Início', path: ROUTE_PATHS.dashboard, icon: '🏠' },
  { shortLabel: 'Treinos', path: ROUTE_PATHS.workouts, icon: '🏋️' },
  { shortLabel: 'Dietas', path: ROUTE_PATHS.diets, icon: '🥗' },
  { shortLabel: 'Progresso', path: ROUTE_PATHS.progress, icon: '📈' },
  { shortLabel: 'Perfil', path: ROUTE_PATHS.profile, icon: '👤' },
];

export const quickSummary = {
  title: 'Resumo do plano',
  items: [
    'Objetivo ativo: recomposição corporal',
    'Treinos da semana: 5 sessões',
    'Meta de água: 3,2 L por dia',
    'Próximo check-in: domingo',
  ],
};

export const dashboardData = {
  title: 'Dashboard',
  subtitle:
    'Visão central do app com resumo do treino, dieta, evolução e próximos ajustes para o usuário acompanhar tudo em um único lugar.',
  badge: 'Painel principal',
  stats: [
    { label: 'Peso atual', value: '82,4 kg', helper: 'Última atualização no check-in' },
    { label: 'Treinos concluídos', value: '3/5', helper: 'Semana atual' },
    { label: 'Aderência da dieta', value: '86%', helper: 'Últimos 7 dias' },
    { label: 'Sono médio', value: '7h12', helper: 'Baseado nos check-ins' },
  ],
  primaryCard: {
    title: 'Resumo da semana',
    description:
      'Essa área centraliza o que mais importa para o usuário: progresso, rotina atual e o que precisa de atenção imediata.',
    items: [
      'Treino A concluído com boa performance.',
      'Peso caiu 0,8 kg nas últimas 2 semanas.',
      'A energia melhorou após ajuste no café da manhã.',
      'A IA recomendou aumentar a ingestão de água em 400 ml.',
    ],
  },
  secondaryCards: [
    {
      title: 'Treino atual',
      description: 'Preview rápido do plano ativo.',
      items: [
        'Divisão ABC com 5 sessões por semana',
        'Foco em peito, costas, pernas e core',
        'Cardio leve pós-treino em 3 dias',
      ],
    },
    {
      title: 'Dieta atual',
      description: 'Resumo nutricional do plano em execução.',
      items: [
        '2.250 kcal por dia',
        '180 g de proteína',
        '4 refeições principais + 1 lanche',
      ],
    },
    {
      title: 'Último check-in',
      description: 'Sinais de aderência e bem-estar.',
      items: [
        'Energia: 4/5',
        'Sono: 4/5',
        'Aderência ao treino: 90%',
      ],
    },
    {
      title: 'Próximos gatilhos',
      description: 'Eventos que alimentam a IA.',
      items: [
        'Novo check-in semanal',
        'Nova foto de progresso',
        'Nova bioimpedância',
      ],
    },
  ],
  asideTitle: 'Prioridades',
  asideItems: [
    'Manter 5 treinos até domingo.',
    'Fazer novo check-in com peso atualizado.',
    'Atualizar foto frontal e lateral.',
    'Revisar plano alimentar na próxima semana.',
  ],
  footerNote:
    'Com isso, o Dashboard passa a ser uma rota real e deixa de depender do estado local baseado em activePage.',
};

export const workoutsViews = {
  list: {
    title: 'Treinos',
    subtitle:
      'Página principal do módulo de treinos, já pronta para listar rotina atual, dividir por dias e evoluir para consumo de backend.',
    badge: 'Plano ativo',
    stats: [
      { label: 'Frequência semanal', value: '5x', helper: 'Meta atual' },
      { label: 'Duração média', value: '58 min', helper: 'Estimativa por sessão' },
      { label: 'Foco principal', value: 'Hipertrofia', helper: 'Objetivo ativo' },
      { label: 'Cardio', value: '3x', helper: 'Após treino' },
    ],
    primaryCard: {
      title: 'Treino da semana',
      description:
        'Essa área representa o treino atual do usuário e depois deve puxar os dados do plano ativo vindos do backend.',
      items: [
        'Segunda: Peito + tríceps',
        'Terça: Costas + bíceps',
        'Quarta: Pernas completas',
        'Quinta: Ombros + core',
        'Sexta: Full upper + cardio',
      ],
    },
    secondaryCards: [
      {
        title: 'Checklist de hoje',
        description: 'Orientações operacionais do treino.',
        items: [
          'Aquecimento de 8 minutos',
          'Carga progressiva no exercício principal',
          'Alongamento leve ao final',
        ],
      },
      {
        title: 'Métricas do treino',
        description: 'Resumo de performance.',
        items: [
          'Percepção de esforço média: 7,8/10',
          'Descanso médio: 75 segundos',
          'Concluídos na semana: 3 treinos',
        ],
      },
    ],
    asideTitle: 'Ações do módulo',
    asideItems: [
      'Rota pronta para histórico de treinos.',
      'Rota pronta para geração de novo treino.',
      'Rota dinâmica pronta para detalhamento por id.',
    ],
    footerNote: 'As rotas /treinos, /treinos/historico, /treinos/gerar e /treinos/:workoutId já estão organizadas.',
  },
  history: {
    title: 'Histórico de treinos',
    subtitle:
      'Página para listar planos anteriores, comparar versões e mostrar evolução das rotinas.',
    badge: 'Histórico',
    stats: [
      { label: 'Planos anteriores', value: '4', helper: 'Registrados até agora' },
      { label: 'Maior sequência', value: '11 dias', helper: 'Sem falhas' },
      { label: 'Volume médio', value: '17 séries', helper: 'Por sessão' },
      { label: 'Última troca', value: '14 dias', helper: 'Plano atual' },
    ],
    primaryCard: {
      title: 'Linha do tempo dos treinos',
      description: 'Estrutura de histórico já pronta para crescer sem retrabalho.',
      items: [
        'Plano 01 — adaptação inicial',
        'Plano 02 — ganho de consistência',
        'Plano 03 — foco em hipertrofia',
        'Plano 04 — divisão atual',
      ],
    },
    secondaryCards: [
      {
        title: 'Comparações',
        description: 'Indicadores futuros da tela.',
        items: [
          'Aumento de carga por exercício',
          'Frequência semanal por plano',
          'Taxa de conclusão por ciclo',
        ],
      },
      {
        title: 'Uso futuro do backend',
        description: 'Ligação lógica da rota.',
        items: [
          'Buscar training_plans por account_id',
          'Ordenar por valid_from desc',
          'Abrir detalhes por workoutId',
        ],
      },
    ],
    asideTitle: 'Próximas integrações',
    asideItems: [
      'Tabela real vinda de training_plans.',
      'Filtro por período.',
      'Indicador de plano ativo e inativo.',
    ],
    footerNote: 'Essa estrutura já deixa o módulo preparado para histórico real sem reescrever a navegação.',
  },
  generate: {
    title: 'Gerar novo treino',
    subtitle:
      'Tela preparada para receber formulário, IA e regras de personalização futuras.',
    badge: 'Novo treino',
    stats: [
      { label: 'Objetivo', value: 'Customização', helper: 'Baseado no perfil' },
      { label: 'Entrada esperada', value: 'Formulário', helper: 'Dados do usuário' },
      { label: 'Saída futura', value: 'Plano novo', helper: 'Persistido no banco' },
      { label: 'Origem', value: 'IA + regras', helper: 'Camada futura' },
    ],
    primaryCard: {
      title: 'Campos que essa rota vai receber',
      description: 'A página já fica reservada para o formulário real do gerador.',
      items: [
        'Objetivo do treino',
        'Dias disponíveis por semana',
        'Lesões e limitações',
        'Nível atual do usuário',
      ],
    },
    secondaryCards: [
      {
        title: 'Fluxo futuro',
        description: 'Como essa tela vai funcionar.',
        items: [
          'Usuário informa preferências',
          'Backend monta payload',
          'IA sugere plano',
          'Plano é salvo como training_plan ativo',
        ],
      },
      {
        title: 'Vantagem da rota',
        description: 'Por que isso é importante agora.',
        items: [
          'URL própria para formulário',
          'Melhor organização do módulo',
          'Sem depender de componente gigante',
        ],
      },
    ],
    asideTitle: 'Preparado para',
    asideItems: [
      'Validação de formulário',
      'Integração com IA',
      'Salvar versão gerada',
    ],
    footerNote: 'A rota já existe hoje, mesmo antes da integração real do gerador.',
  },
  detail: {
    title: 'Detalhamento do treino',
    subtitle:
      'Rota dinâmica pronta para receber o id do treino e carregar exercícios, séries e observações.',
    badge: 'Detalhe',
    stats: [
      { label: 'Exercícios', value: '8', helper: 'Exemplo visual' },
      { label: 'Séries', value: '22', helper: 'Volume total' },
      { label: 'Descanso', value: '60-90s', helper: 'Faixa padrão' },
      { label: 'Tempo médio', value: '62 min', helper: 'Sessão completa' },
    ],
    primaryCard: {
      title: 'Estrutura do treino detalhado',
      description: 'Depois essa rota vai consumir training_days e training_exercises.',
      items: [
        'Supino reto — 4x8',
        'Supino inclinado — 3x10',
        'Crucifixo máquina — 3x12',
        'Tríceps corda — 4x12',
      ],
    },
    secondaryCards: [
      {
        title: 'Dados futuros do backend',
        description: 'Tabelas previstas.',
        items: [
          'training_plans',
          'training_days',
          'training_exercises',
        ],
      },
      {
        title: 'Expansões futuras',
        description: 'Próxima camada desse módulo.',
        items: [
          'Vídeo do exercício',
          'Carga usada no último treino',
          'Check de conclusão por sessão',
        ],
      },
    ],
    asideTitle: 'Uso da rota dinâmica',
    asideItems: [
      'Receber o workoutId pela URL.',
      'Buscar o plano correspondente.',
      'Exibir a sessão detalhada.',
    ],
    footerNote: 'Essa é a base pronta para o backend ler /treinos/:workoutId sem retrabalho.',
  },
};

export const dietsViews = {
  list: {
    title: 'Dietas',
    subtitle:
      'Página principal do plano alimentar atual, preparada para mostrar refeições, macros e ajustes.',
    badge: 'Plano alimentar',
    stats: [
      { label: 'Calorias', value: '2.250 kcal', helper: 'Meta diária' },
      { label: 'Proteína', value: '180 g', helper: 'Distribuição alvo' },
      { label: 'Carboidratos', value: '210 g', helper: 'Base atual' },
      { label: 'Gorduras', value: '70 g', helper: 'Limite diário' },
    ],
    primaryCard: {
      title: 'Estrutura atual da dieta',
      description: 'A página fica pronta para puxar o plano ativo e suas refeições.',
      items: [
        'Café da manhã com proteína + fruta',
        'Almoço com proteína magra + arroz',
        'Lanche pré-treino',
        'Jantar com foco em saciedade',
      ],
    },
    secondaryCards: [
      {
        title: 'Substituições',
        description: 'Bloco futuro do plano.',
        items: [
          'Frango por patinho moído',
          'Arroz por batata inglesa',
          'Iogurte por whey + aveia',
        ],
      },
      {
        title: 'Monitoramento',
        description: 'Indicadores previstos.',
        items: [
          'Aderência alimentar semanal',
          'Macronutrientes consumidos',
          'Alertas de inconsistência',
        ],
      },
    ],
    asideTitle: 'Rotas do módulo',
    asideItems: [
      'Página principal da dieta ativa.',
      'Histórico de dietas antigas.',
      'Gerador de nova dieta.',
      'Detalhe por id da dieta.',
    ],
    footerNote: 'O módulo deixa de ser apenas visual e passa a ter estrutura de navegação real.',
  },
  history: {
    title: 'Histórico de dietas',
    subtitle: 'Tela reservada para comparar planos alimentares passados e atuais.',
    badge: 'Histórico',
    stats: [
      { label: 'Planos anteriores', value: '3', helper: 'Registrados' },
      { label: 'Última revisão', value: '8 dias', helper: 'Plano atual' },
      { label: 'Maior aderência', value: '92%', helper: 'Melhor fase' },
      { label: 'Ajustes', value: '6', helper: 'No último ciclo' },
    ],
    primaryCard: {
      title: 'Linha do tempo alimentar',
      description: 'Depois vai listar diet_plans por período e status.',
      items: [
        'Plano cutting inicial',
        'Plano manutenção',
        'Plano atual com recomp',
      ],
    },
    secondaryCards: [
      {
        title: 'Indicadores futuros',
        description: 'Camada analítica da página.',
        items: [
          'Mudança de calorias por plano',
          'Troca de estratégia',
          'Aderência por ciclo',
        ],
      },
      {
        title: 'Integração futura',
        description: 'Tabelas previstas.',
        items: [
          'diet_plans',
          'diet_meals',
          'diet_meal_items',
        ],
      },
    ],
    asideTitle: 'Próximas ações',
    asideItems: [
      'Listar planos em ordem cronológica.',
      'Comparar macros entre versões.',
      'Destacar plano ativo.',
    ],
    footerNote: 'Essa rota já está reservada para a camada histórica real.',
  },
  generate: {
    title: 'Gerar nova dieta',
    subtitle:
      'Tela preparada para receber formulário nutricional, regras do usuário e geração assistida por IA.',
    badge: 'Nova dieta',
    stats: [
      { label: 'Entrada', value: 'Preferências', helper: 'Base do usuário' },
      { label: 'Restrições', value: 'Suportadas', helper: 'Campo futuro' },
      { label: 'Saída', value: 'Plano salvo', helper: 'Persistência prevista' },
      { label: 'Motor', value: 'IA + regras', helper: 'Camada futura' },
    ],
    primaryCard: {
      title: 'Campos da geração',
      description: 'A rota já nasce pronta para o formulário real.',
      items: [
        'Meta calórica',
        'Preferências e restrições',
        'Quantidade de refeições',
        'Objetivo físico',
      ],
    },
    secondaryCards: [
      {
        title: 'Resultado esperado',
        description: 'O que a rota vai devolver.',
        items: [
          'Dieta gerada',
          'Macros calculados',
          'Refeições organizadas',
          'Substituições possíveis',
        ],
      },
      {
        title: 'Benefício da estrutura',
        description: 'Ganho técnico imediato.',
        items: [
          'Separação da responsabilidade',
          'URL própria para geração',
          'Base pronta para backend',
        ],
      },
    ],
    asideTitle: 'Preparado para',
    asideItems: [
      'Validação dos campos',
      'Consumo de IA',
      'Versionamento da dieta',
    ],
    footerNote: 'A tela fica reservada para o gerador sem bagunçar a página principal.',
  },
  detail: {
    title: 'Detalhamento da dieta',
    subtitle:
      'Rota dinâmica para abrir uma dieta específica e visualizar refeições, alimentos e substituições.',
    badge: 'Detalhe',
    stats: [
      { label: 'Refeições', value: '5', helper: 'Exemplo atual' },
      { label: 'Itens totais', value: '16', helper: 'Distribuição do dia' },
      { label: 'Água', value: '3,2 L', helper: 'Meta diária' },
      { label: 'Foco', value: 'Saciedade', helper: 'Objetivo da estratégia' },
    ],
    primaryCard: {
      title: 'Exemplo de distribuição',
      description: 'Depois esta rota vai puxar diet_meals e diet_meal_items.',
      items: [
        '08:00 — ovos + fruta + café',
        '12:30 — arroz + frango + legumes',
        '16:00 — whey + banana',
        '20:00 — jantar leve com proteína',
      ],
    },
    secondaryCards: [
      {
        title: 'Dados futuros',
        description: 'Tabela de origem.',
        items: ['diet_plans', 'diet_meals', 'diet_meal_items'],
      },
      {
        title: 'Expansões',
        description: 'Próximas camadas possíveis.',
        items: [
          'Lista de substituições por refeição',
          'Marcador de consumo',
          'Integração com check-ins',
        ],
      },
    ],
    asideTitle: 'Uso da rota dinâmica',
    asideItems: [
      'Receber dietId pela URL.',
      'Buscar dieta correspondente.',
      'Exibir plano detalhado.',
    ],
    footerNote: 'Essa base já deixa o detalhamento da dieta pronto para backend real.',
  },
};

export const progressViews = {
  overview: {
    title: 'Progresso',
    subtitle:
      'Página central do acompanhamento corporal com gráficos, indicadores e visão geral da evolução.',
    badge: 'Evolução',
    stats: [
      { label: 'Peso', value: '-0,8 kg', helper: 'Últimas 2 semanas' },
      { label: 'Gordura corporal', value: '-1,4%', helper: 'Última bio' },
      { label: 'Massa magra', value: '+0,6 kg', helper: 'Último ciclo' },
      { label: 'Check-ins', value: '12', helper: 'Acumulado do ciclo' },
    ],
    primaryCard: {
      title: 'Resumo de evolução',
      description:
        'Essa rota vira o centro analítico da transformação do usuário.',
      items: [
        'Queda gradual de peso sem perda relevante de massa magra',
        'Aderência boa nos últimos 14 dias',
        'Melhora do sono refletindo na energia',
      ],
    },
    secondaryCards: [
      {
        title: 'Dados monitorados',
        description: 'Fontes do progresso.',
        items: [
          'Body measurements',
          'Bioimpedância',
          'Fotos',
          'Check-ins',
        ],
      },
      {
        title: 'Visões complementares',
        description: 'Subrotas já previstas.',
        items: [
          'Fotos',
          'Comparação',
          'Bioimpedância',
          'Medidas',
        ],
      },
    ],
    asideTitle: 'Próximos pontos',
    asideItems: [
      'Adicionar gráficos reais.',
      'Ligar com body_measurements.',
      'Cruzar com check-ins.',
    ],
    footerNote: 'A navegação do progresso já nasce preparada para várias subpáginas sem reestruturar depois.',
  },
  photos: {
    title: 'Progresso por fotos',
    subtitle: 'Subpágina destinada à timeline visual de fotos do usuário.',
    badge: 'Fotos',
    stats: [
      { label: 'Fotos salvas', value: '18', helper: 'Frente, lado e costas' },
      { label: 'Último envio', value: '6 dias', helper: 'Mais recente' },
      { label: 'Comparações', value: '3', helper: 'Sequências prontas' },
      { label: 'Ângulos', value: '3', helper: 'Padronizados' },
    ],
    primaryCard: {
      title: 'Linha do tempo',
      description: 'Essa rota será a timeline visual das imagens de evolução.',
      items: [
        'Foto frontal',
        'Foto lateral',
        'Foto posterior',
        'Comparações por data',
      ],
    },
    secondaryCards: [
      {
        title: 'Ligação de dados',
        description: 'Origem futura.',
        items: [
          'progress_photos',
          'body_measurements',
          'checkins',
        ],
      },
      {
        title: 'Expansão futura',
        description: 'Melhorias previstas.',
        items: [
          'Comparador deslizante',
          'Filtro por período',
          'Agrupar por fase do plano',
        ],
      },
    ],
    asideTitle: 'Uso futuro',
    asideItems: [
      'Upload organizado por ângulo.',
      'Comparações por faixa de datas.',
      'Integração com check-in semanal.',
    ],
    footerNote: 'A rota /progresso/fotos já está pronta para receber a timeline real.',
  },
  compare: {
    title: 'Comparar evolução',
    subtitle: 'Subpágina preparada para antes e depois e comparação entre períodos.',
    badge: 'Comparação',
    stats: [
      { label: 'Comparações prontas', value: '3', helper: 'Exemplo inicial' },
      { label: 'Período', value: '90 dias', helper: 'Comparação principal' },
      { label: 'Diferença de peso', value: '-4,2 kg', helper: 'Exemplo visual' },
      { label: 'Diferença de gordura', value: '-3,6%', helper: 'Exemplo visual' },
    ],
    primaryCard: {
      title: 'Antes vs depois',
      description: 'A rota fica pronta para comparações visuais e numéricas.',
      items: [
        'Comparar foto inicial e atual',
        'Comparar medidas',
        'Comparar bioimpedância',
      ],
    },
    secondaryCards: [
      {
        title: 'Usos futuros',
        description: 'Visões que fazem sentido aqui.',
        items: [
          'Comparação entre datas escolhidas',
          'Comparação entre ciclos de treino',
          'Comparação entre dietas',
        ],
      },
      {
        title: 'Integrações',
        description: 'Fontes analíticas.',
        items: [
          'progress_photos',
          'bioimpedance_records',
          'body_measurements',
        ],
      },
    ],
    asideTitle: 'Estrutura preparada',
    asideItems: [
      'Comparação por duas datas.',
      'Renderizar cards analíticos.',
      'Mostrar resumo em destaque.',
    ],
    footerNote: 'A subrota já existe para o comparador real entrar depois sem mexer na arquitetura.',
  },
  bio: {
    title: 'Bioimpedância',
    subtitle:
      'Subpágina pronta para histórico detalhado de composição corporal e análise técnica.',
    badge: 'Bioimpedância',
    stats: [
      { label: 'Último percentual', value: '16,8%', helper: 'Gordura corporal' },
      { label: 'Água corporal', value: '58,1%', helper: 'Última leitura' },
      { label: 'Massa magra', value: '68,5 kg', helper: 'Última leitura' },
      { label: 'Idade metabólica', value: '27', helper: 'Indicador atual' },
    ],
    primaryCard: {
      title: 'Histórico técnico',
      description: 'Depois essa rota vai ler bioimpedance_records.',
      items: [
        'Gordura corporal',
        'Massa muscular',
        'Água corporal',
        'Taxa metabólica basal',
      ],
    },
    secondaryCards: [
      {
        title: 'Valor analítico',
        description: 'Para o acompanhamento inteligente.',
        items: [
          'Validar direção da evolução',
          'Cruzar com dieta e treino',
          'Detectar necessidade de ajuste',
        ],
      },
      {
        title: 'Uso no backend',
        description: 'Ligação direta com o banco.',
        items: [
          'bioimpedance_records',
          'user_goals',
          'checkins',
        ],
      },
    ],
    asideTitle: 'Próximos pontos',
    asideItems: [
      'Adicionar tabela histórica.',
      'Comparar leituras por data.',
      'Cruzar com o plano ativo.',
    ],
    footerNote: 'A rota técnica do módulo de progresso já está mapeada.',
  },
  measurements: {
    title: 'Medidas corporais',
    subtitle:
      'Subpágina para circunferências e medições por data, pronta para histórico real.',
    badge: 'Medidas',
    stats: [
      { label: 'Cintura', value: '-3 cm', helper: 'Último ciclo' },
      { label: 'Peito', value: '+1,5 cm', helper: 'Último ciclo' },
      { label: 'Braço', value: '+0,8 cm', helper: 'Último ciclo' },
      { label: 'Coxa', value: '+1,1 cm', helper: 'Último ciclo' },
    ],
    primaryCard: {
      title: 'Registros previstos',
      description: 'Essa subrota vai consumir a tabela body_measurements.',
      items: [
        'Peso',
        'Cintura',
        'Quadril',
        'Peito',
        'Braço',
        'Coxa',
      ],
    },
    secondaryCards: [
      {
        title: 'Valor do histórico',
        description: 'Por que essa tela importa.',
        items: [
          'Mostrar tendência real',
          'Comparar períodos',
          'Dar contexto para fotos',
        ],
      },
      {
        title: 'Uso futuro',
        description: 'Componentes ideais para essa rota.',
        items: [
          'Tabela por data',
          'Cards por medida',
          'Gráfico evolutivo',
        ],
      },
    ],
    asideTitle: 'Preparado para',
    asideItems: [
      'Cadastro manual de medidas.',
      'Histórico por data.',
      'Análise da IA com base nas medidas.',
    ],
    footerNote: 'A rota /progresso/medidas já fica pronta para receber o histórico sem refazer a navegação.',
  },
};

export const checkinViews = {
  list: {
    title: 'Check-ins',
    subtitle:
      'Página de histórico de acompanhamento semanal do usuário.',
    badge: 'Acompanhamento',
    stats: [
      { label: 'Check-ins no ciclo', value: '12', helper: 'Acumulado' },
      { label: 'Energia média', value: '4/5', helper: 'Últimos 30 dias' },
      { label: 'Sono médio', value: '4/5', helper: 'Últimos 30 dias' },
      { label: 'Aderência', value: '88%', helper: 'Treino + dieta' },
    ],
    primaryCard: {
      title: 'Histórico recente',
      description:
        'Essa rota será o centro dos registros periódicos do usuário e gatilho para ajustes pela IA.',
      items: [
        'Peso',
        'Energia',
        'Sono',
        'Aderência ao treino',
        'Aderência à dieta',
      ],
    },
    secondaryCards: [
      {
        title: 'Importância do módulo',
        description: 'Valor lógico no sistema.',
        items: [
          'Atualiza o estado atual do usuário',
          'Gera insumo para a IA',
          'Move o plano conforme a evolução',
        ],
      },
      {
        title: 'Integrações futuras',
        description: 'Tabelas relacionadas.',
        items: [
          'checkins',
          'training_plans',
          'diet_plans',
          'ai_recommendations',
        ],
      },
    ],
    asideTitle: 'Subrota prevista',
    asideItems: [
      'Página nova para registrar check-in.',
      'Histórico por data.',
      'Comparação com medidas e progresso.',
    ],
    footerNote: 'O módulo já está com rota principal e subrota de novo check-in prontas.',
  },
  new: {
    title: 'Novo check-in',
    subtitle:
      'Tela separada para o formulário real de acompanhamento semanal.',
    badge: 'Novo registro',
    stats: [
      { label: 'Campos base', value: '8+', helper: 'Estrutura futura' },
      { label: 'Frequência ideal', value: '1x semana', helper: 'Recomendado' },
      { label: 'Gatilho IA', value: 'Ativo', helper: 'Na arquitetura' },
      { label: 'Saída', value: 'Persistência', helper: 'Banco de dados' },
    ],
    primaryCard: {
      title: 'Campos da tela',
      description: 'Essa rota já fica reservada para o formulário real.',
      items: [
        'Peso atual',
        'Energia',
        'Qualidade do sono',
        'Aderência',
        'Observações',
        'Foto opcional',
      ],
    },
    secondaryCards: [
      {
        title: 'Fluxo futuro',
        description: 'O que essa tela vai fazer.',
        items: [
          'Salvar registro',
          'Atualizar histórico',
          'Recalcular indicadores',
          'Gerar recomendação',
        ],
      },
      {
        title: 'Ganho estrutural',
        description: 'Motivo da separação.',
        items: [
          'URL própria',
          'Melhor organização',
          'Base para validação',
        ],
      },
    ],
    asideTitle: 'Preparado para',
    asideItems: [
      'Formulário controlado',
      'Validação de entrada',
      'POST para backend',
    ],
    footerNote: 'A rota /checkins/novo já está pronta para a próxima etapa de formulários.',
  },
};

export const chatData = {
  title: 'Chat IA',
  subtitle:
    'Canal central para dúvidas, ajustes de treino, ajustes de dieta e recomendações contextuais.',
  badge: 'Assistente inteligente',
  stats: [
    { label: 'Contextos', value: 'Treino + dieta', helper: 'Baseados no perfil' },
    { label: 'Uso previsto', value: 'Contínuo', helper: 'Durante a jornada' },
    { label: 'Entrada futura', value: 'Mensagens', helper: 'Persistidas' },
    { label: 'Saída futura', value: 'Recomendações', helper: 'Com histórico' },
  ],
  primaryCard: {
    title: 'Função do módulo',
    description:
      'Essa rota vira o ponto de conversa do usuário com a IA, com histórico próprio e contexto vindo do perfil.',
    items: [
      'Tirar dúvidas sobre treino',
      'Pedir ajuste de dieta',
      'Entender evolução do progresso',
      'Receber orientações rápidas',
    ],
  },
  secondaryCards: [
    {
      title: 'Estrutura futura',
      description: 'Camada de dados pensada.',
      items: [
        'chat_sessions',
        'chat_messages',
        'ai_recommendations',
      ],
    },
    {
      title: 'Valor do histórico',
      description: 'Por que salvar mensagens.',
      items: [
        'Contexto contínuo',
        'Personalização real',
        'Auditoria das recomendações',
      ],
    },
  ],
  asideTitle: 'Próximos passos do chat',
  asideItems: [
    'Criar interface de conversa.',
    'Salvar histórico por sessão.',
    'Conectar com IA real.',
  ],
  footerNote: 'A rota /chat já fica isolada para evoluir sem afetar os demais módulos.',
};

export const profileViews = {
  view: {
    title: 'Perfil',
    subtitle:
      'Página com dados pessoais, objetivo atual, preferências e configurações do usuário.',
    badge: 'Conta e perfil',
    stats: [
      { label: 'Objetivo atual', value: 'Recomposição', helper: 'Meta ativa' },
      { label: 'Altura', value: '1,78 m', helper: 'Perfil físico' },
      { label: 'Peso base', value: '82,4 kg', helper: 'Último check-in' },
      { label: 'Nível', value: 'Intermediário', helper: 'Treino atual' },
    ],
    primaryCard: {
      title: 'Dados centrais do perfil',
      description:
        'Essa rota centraliza as informações principais do usuário para alimentar treino, dieta e IA.',
      items: [
        'Dados físicos',
        'Objetivos',
        'Preferências',
        'Restrições',
        'Histórico resumido',
      ],
    },
    secondaryCards: [
      {
        title: 'Camadas futuras',
        description: 'Ligação lógica do módulo.',
        items: [
          'accounts',
          'user_profiles',
          'user_goals',
          'user_health_profiles',
          'user_nutrition_preferences',
        ],
      },
      {
        title: 'Uso no sistema',
        description: 'Por que isso é estrutural.',
        items: [
          'Base do treino',
          'Base da dieta',
          'Base da IA',
        ],
      },
    ],
    asideTitle: 'Rota complementar',
    asideItems: [
      'Tela de edição separada.',
      'Atualização dos dados pessoais.',
      'Revisão do objetivo ativo.',
    ],
    footerNote: 'Perfil e edição ficam separados em rotas próprias.',
  },
  edit: {
    title: 'Editar perfil',
    subtitle:
      'Tela reservada para o formulário real de edição do perfil do usuário.',
    badge: 'Editar dados',
    stats: [
      { label: 'Campos previstos', value: '10+', helper: 'Base inicial' },
      { label: 'Origem', value: 'Profile + goals', helper: 'Banco' },
      { label: 'Uso', value: 'Configuração', helper: 'Pelo usuário' },
      { label: 'Impacto', value: 'Global', helper: 'No sistema todo' },
    ],
    primaryCard: {
      title: 'Campos esperados',
      description: 'A rota já fica pronta para o formulário real.',
      items: [
        'Nome',
        'Data de nascimento',
        'Altura',
        'Objetivo',
        'Nível',
        'Preferências',
        'Restrições',
      ],
    },
    secondaryCards: [
      {
        title: 'Fluxo futuro',
        description: 'O que acontece ao salvar.',
        items: [
          'Atualiza perfil',
          'Atualiza objetivo',
          'Pode recalcular recomendações',
        ],
      },
      {
        title: 'Vantagem',
        description: 'Motivo da separação.',
        items: [
          'Página focada em edição',
          'Validação específica',
          'Melhor manutenção',
        ],
      },
    ],
    asideTitle: 'Preparado para',
    asideItems: [
      'Validação dos campos',
      'Persistência em backend',
      'Reprocessamento do plano',
    ],
    footerNote: 'A subrota /perfil/editar já está reservada para a próxima etapa.',
  },
};

export const settingsData = {
  title: 'Configurações',
  subtitle:
    'Módulo separado para segurança, notificações, privacidade e preferências gerais da conta.',
  badge: 'Configurações',
  stats: [
    { label: 'Notificações', value: 'Ativas', helper: 'Configuração exemplo' },
    { label: 'Privacidade', value: 'Padrão', helper: 'Configuração exemplo' },
    { label: 'Login social', value: 'Preparado', helper: 'Futuro' },
    { label: 'Conta', value: 'Operacional', helper: 'Estrutura base' },
  ],
  primaryCard: {
    title: 'Blocos previstos',
    description:
      'Essa rota recebe ajustes de conta sem misturar com o módulo do perfil.',
    items: [
      'Senha',
      'Login social',
      'Notificações',
      'Privacidade',
      'Exclusão de conta',
    ],
  },
  secondaryCards: [
    {
      title: 'Importância da rota',
      description: 'Valor estrutural.',
      items: [
        'Separa conta de perfil',
        'Ajuda manutenção futura',
        'Organiza governança dos dados',
      ],
    },
    {
      title: 'Próxima camada',
      description: 'Evoluções esperadas.',
      items: [
        'Preferências de notificação',
        'Gerenciamento de sessão',
        'Políticas de privacidade',
      ],
    },
  ],
  asideTitle: 'Próximos passos',
  asideItems: [
    'Criar switches e formulários.',
    'Persistir configurações do usuário.',
    'Conectar com autenticação real.',
  ],
  footerNote: 'Configurações agora tem rota própria e separada do restante do perfil.',
};