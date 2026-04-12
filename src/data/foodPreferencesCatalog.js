const markOptions = [
  { id: "gosta", label: "Gosto", tone: "positive" },
  { id: "nao_gosta", label: "Nao gosto", tone: "negative" },
  { id: "alergia", label: "Alergia", tone: "danger" },
  { id: "intolerancia", label: "Intolerancia", tone: "warning" },
  { id: "evito", label: "Evito", tone: "muted" },
  { id: "quero_incluir", label: "Quero incluir", tone: "positive" },
];

const regularMarks = ["gosta", "nao_gosta", "evito", "quero_incluir"];
const restrictionMarks = ["alergia", "intolerancia", "evito"];
const preferenceMarks = ["gosta", "nao_gosta", "evito", "quero_incluir"];

const foodGroups = [
  {
    id: "proteinas-animais",
    title: "Proteinas animais",
    subgroups: [
      { title: "Carnes bovinas", items: ["Patinho", "Coxao mole", "Coxao duro", "Alcatra", "Contra-file", "File mignon", "Acem", "Musculo", "Fraldinha", "Picanha", "Carne moida bovina", "Figado bovino", "Miudos bovinos"] },
      { title: "Carnes suinas", items: ["Lombo suino", "Pernil suino", "File suino", "Costelinha suina", "Copa lombo", "Bacon", "Presunto", "Linguica suina", "Miudos suinos"] },
      { title: "Frango e aves", items: ["Peito de frango", "Sobrecoxa", "Coxa", "Frango desfiado", "Frango moido", "Peru", "Peito de peru", "Pato", "Codorna"] },
      { title: "Peixes", items: ["Salmao", "Tilapia", "Atum", "Sardinha", "Merluza", "Pescada", "Bacalhau", "Cacao", "Robalo", "Linguado", "Truta", "Anchova", "Pintado", "Tambaqui", "Outros peixes"] },
      { title: "Frutos do mar", items: ["Camarao", "Lula", "Polvo", "Mexilhao", "Ostra", "Marisco", "Siri", "Caranguejo", "Lagosta"] },
      { title: "Ovos", items: ["Ovo de galinha", "Clara de ovo", "Gema de ovo", "Ovo caipira", "Ovo de codorna"] },
      { title: "Embutidos e processados proteicos", items: ["Presunto", "Peito de peru", "Mortadela", "Salame", "Salsicha", "Linguica", "Hamburguer industrializado", "Nuggets", "Carne seca", "Charque", "Atum enlatado", "Sardinha enlatada"] },
    ],
  },
  {
    id: "proteinas-vegetais",
    title: "Proteinas vegetais",
    subgroups: [
      { title: "Leguminosas", items: ["Feijao carioca", "Feijao preto", "Feijao branco", "Feijao fradinho", "Feijao vermelho", "Lentilha", "Grao-de-bico", "Ervilha", "Soja em grao", "Edamame"] },
      { title: "Derivados de soja", items: ["Tofu", "Tempeh", "Proteina de soja texturizada", "Carne de soja", "Leite de soja", "Iogurte de soja"] },
      { title: "Outras proteinas vegetais", items: ["Seitan", "Proteina de ervilha", "Proteina de arroz", "Blend vegetal proteico", "Hamburguer vegetal", "Almondega vegetal", "Falafel"] },
    ],
  },
  {
    id: "carboidratos",
    title: "Carboidratos",
    subgroups: [
      { title: "Arroz e graos", items: ["Arroz branco", "Arroz integral", "Arroz parboilizado", "Arroz negro", "Arroz vermelho", "Arroz japones", "Quinoa", "Cevada", "Trigo em grao", "Cuscuz marroquino", "Bulgur", "Milheto"] },
      { title: "Massas", items: ["Macarrao tradicional", "Macarrao integral", "Macarrao sem gluten", "Macarrao de arroz", "Macarrao de grao-de-bico", "Lasanha", "Nhoque", "Ravioli", "Talharim", "Espaguete"] },
      { title: "Paes e panificados", items: ["Pao frances", "Pao integral", "Pao de forma", "Pao de fermentacao natural", "Pao sirio", "Tortilha", "Rap10 / wrap", "Bisnaga", "Torrada", "Biscoito de arroz", "Biscoito integral", "Tapioca pronta", "Cuscuz de milho"] },
      { title: "Cereais e farinhas", items: ["Aveia", "Granola", "Farelo de aveia", "Farinha de aveia", "Farinha de trigo", "Farinha integral", "Farinha de arroz", "Fuba", "Polvilho doce", "Polvilho azedo", "Farinha de mandioca", "Farinha de milho"] },
      { title: "Tuberculos e raizes", items: ["Batata inglesa", "Batata-doce", "Batata baroa", "Batata yacon", "Mandioca", "Aipim", "Macaxeira", "Inhame", "Cara", "Mandioquinha", "Beterraba", "Nabo"] },
      { title: "Outros carboidratos comuns", items: ["Tapioca", "Cuscuz", "Milho", "Pipoca", "Pamonha", "Canjica", "Polenta", "Panqueca", "Crepioca"] },
    ],
  },
  {
    id: "frutas",
    title: "Frutas",
    subgroups: [
      { title: "Frutas comuns", items: ["Banana", "Maca", "Pera", "Mamao", "Melancia", "Melao", "Uva", "Manga", "Abacaxi", "Laranja", "Tangerina", "Mexerica", "Limao", "Morango", "Kiwi", "Goiaba", "Maracuja", "Pessego", "Ameixa", "Caqui", "Abacate", "Coco"] },
      { title: "Frutas vermelhas e similares", items: ["Morango", "Mirtilo", "Amora", "Framboesa", "Cereja", "Cranberry"] },
      { title: "Regionais e tropicais", items: ["Acai", "Acerola", "Caju", "Jabuticaba", "Graviola", "Cupuacu", "Jaca", "Pitaya", "Seriguela", "Umbu", "Caja", "Atemoia"] },
      { title: "Secas e desidratadas", items: ["Uva-passa", "Damasco seco", "Tâmara", "Ameixa seca", "Banana passa", "Maca desidratada", "Coco seco"] },
    ],
  },
  {
    id: "verduras-legumes",
    title: "Verduras e legumes",
    subgroups: [
      { title: "Folhas", items: ["Alface", "Rucula", "Agriao", "Espinafre", "Couve", "Acelga", "Repolho", "Chicoria", "Escarola", "Almeirao"] },
      { title: "Legumes e hortalicas", items: ["Tomate", "Pepino", "Cenoura", "Abobrinha", "Berinjela", "Chuchu", "Vagem", "Quiabo", "Brocolis", "Couve-flor", "Pimentao", "Cebola", "Alho", "Alho-poro", "Abobora", "Moranga", "Cabotia", "Ervilha torta", "Aspargos", "Palmito", "Cogumelos", "Milho verde"] },
      { title: "Cogumelos", items: ["Champignon", "Shimeji", "Shiitake", "Portobello", "Funghi"] },
    ],
  },
  {
    id: "laticinios",
    title: "Laticinios",
    subgroups: [
      { title: "Leites", items: ["Leite integral", "Leite semidesnatado", "Leite desnatado", "Leite zero lactose", "Leite em po", "Bebida lactea"] },
      { title: "Iogurtes", items: ["Iogurte natural", "Iogurte integral", "Iogurte desnatado", "Iogurte grego", "Iogurte zero lactose", "Kefir", "Coalhada"] },
      { title: "Queijos", items: ["Mussarela", "Prato", "Minas frescal", "Minas padrao", "Cottage", "Ricota", "Requeijao", "Cream cheese", "Parmesao", "Provolone", "Queijo coalho", "Brie", "Gorgonzola", "Mucarela de bufala"] },
      { title: "Outros derivados", items: ["Manteiga", "Margarina", "Creme de leite", "Leite condensado", "Doce de leite", "Whey protein", "Caseina"] },
    ],
  },
  {
    id: "gorduras",
    title: "Gorduras e oleaginosas",
    subgroups: [
      { title: "Oleaginosas", items: ["Amendoim", "Castanha-do-para", "Castanha de caju", "Nozes", "Amendoas", "Pistache", "Macadamia", "Avela", "Peca"] },
      { title: "Sementes", items: ["Chia", "Linhaca", "Gergelim", "Semente de abobora", "Semente de girassol"] },
      { title: "Outras fontes", items: ["Abacate", "Azeitona", "Pasta de amendoim", "Pasta de castanha", "Tahine", "Coco", "Leite de coco", "Oleo de coco", "Azeite de oliva", "Oleo de girassol", "Oleo de soja", "Oleo de canola", "Banha", "Maionese"] },
    ],
  },
  {
    id: "bebidas",
    title: "Bebidas",
    subgroups: [
      { title: "Bebidas basicas", items: ["Agua", "Agua com gas", "Agua saborizada", "Cafe", "Cafe descafeinado", "Cha preto", "Cha verde", "Cha de ervas", "Suco natural", "Suco integral", "Suco de caixinha", "Agua de coco"] },
      { title: "Bebidas vegetais", items: ["Bebida de soja", "Bebida de aveia", "Bebida de arroz", "Bebida de amendoas", "Bebida de coco", "Bebida de castanha"] },
      { title: "Adocadas e industrializadas", items: ["Refrigerante normal", "Refrigerante zero", "Energetico", "Isotonico", "Achocolatado", "Bebida proteica pronta", "Kombucha"] },
      { title: "Bebidas alcoolicas", items: ["Cerveja", "Vinho", "Espumante", "Vodca", "Gin", "Whisky", "Licor", "Drinks prontos"] },
    ],
  },
  {
    id: "doces-sobremesas",
    title: "Doces e sobremesas",
    subgroups: [
      { title: "Acucares e adocantes", items: ["Acucar refinado", "Acucar mascavo", "Acucar demerara", "Mel", "Melado", "Geleia", "Xarope de bordo", "Adocante artificial", "Stevia", "Xilitol", "Eritritol", "Sucralose"] },
      { title: "Doces e sobremesas", items: ["Chocolate ao leite", "Chocolate amargo", "Chocolate branco", "Brigadeiro", "Sorvete", "Acai adocado", "Bolo", "Cookies", "Pudim", "Mousse", "Doce de leite", "Pacoca", "Barrinha de cereal", "Barrinha proteica", "Gelatina", "Sobremesas zero acucar"] },
    ],
  },
  {
    id: "molhos-temperos",
    title: "Molhos e temperos",
    subgroups: [
      { title: "Temperos e condimentos", items: ["Sal", "Sal light", "Pimenta", "Curry", "Paprica", "Oregano", "Chimichurri", "Acafrao", "Cominho", "Canela", "Cacau em po"] },
      { title: "Molhos", items: ["Ketchup", "Mostarda", "Maionese", "Barbecue", "Shoyu", "Molho ingles", "Molho de tomate", "Molho pesto", "Molho de alho", "Molho de iogurte", "Tahine"] },
      { title: "Acompanhamentos", items: ["Azeitona", "Picles", "Milho", "Ervilha", "Palmito", "Requeijao", "Creme de ricota"] },
    ],
  },
  {
    id: "industrializados",
    title: "Industrializados",
    subgroups: [
      { title: "Proteicos / fitness", items: ["Whey protein", "Caseina", "Albumina", "Proteina vegetal em po", "Barrinha proteica", "Iogurte proteico", "Bebida proteica pronta"] },
      { title: "Prontos e congelados", items: ["Marmita congelada", "Pizza", "Lasanha congelada", "Hamburguer congelado", "Nuggets", "Empanados", "Sopas prontas", "Macarrao instantaneo"] },
      { title: "Lanches rapidos", items: ["Biscoito recheado", "Salgadinho", "Torrada industrializada", "Snack proteico", "Cookies fitness", "Pipoca de micro-ondas"] },
    ],
  },
  {
    id: "alergias-intolerancias",
    title: "Alergias e intolerancias",
    defaultMarks: restrictionMarks,
    subgroups: [
      { title: "Alergenos e sensibilidades comuns", items: ["Leite e derivados", "Lactose", "Proteina do leite", "Ovo", "Soja", "Trigo", "Gluten", "Amendoim", "Castanhas / oleaginosas", "Peixes", "Crustaceos", "Frutos do mar", "Gergelim"] },
      { title: "Desconforto digestivo", items: ["Feijao", "Lentilha", "Grao-de-bico", "Leite", "Queijo", "Iogurte", "Brocolis", "Couve-flor", "Cebola", "Alho", "Pimentao", "Cafe", "Refrigerante", "Alimentos apimentados", "Fritura", "Alcool"] },
    ],
  },
  {
    id: "preferencias-gerais",
    title: "Preferencias alimentares",
    defaultMarks: preferenceMarks,
    subgroups: [
      { title: "Estilo alimentar", items: ["Onivoro", "Vegetariano", "Ovolactovegetariano", "Vegano", "Pescetariano"] },
      { title: "Restricoes escolhidas", items: ["Sem lactose", "Sem gluten", "Sem acucar", "Baixo carboidrato", "Low fat", "Alta proteina", "Sem carne vermelha", "Sem carne suina", "Sem frutos do mar", "Sem peixe", "Sem ovo", "Sem soja"] },
      { title: "Rotina e praticidade", items: ["Prefere refeicoes rapidas", "Prefere alimentos simples", "Prefere cozinhar", "Nao gosta de cozinhar", "Quer opcoes baratas", "Quer opcoes mais naturais", "Aceita suplementos", "Nao quer suplementos"] },
    ],
  },
];

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const foodMarkOptions = markOptions;

export const foodPreferencesCatalog = foodGroups.map((group) => ({
  id: group.id,
  title: group.title,
  subgroups: group.subgroups.map((subgroup) => ({
    title: subgroup.title,
    items: subgroup.items.map((name) => ({
      id: `${group.id}-${slugify(subgroup.title)}-${slugify(name)}`,
      name,
      group: group.title,
      subgroup: subgroup.title,
      allowedMarks: group.defaultMarks || regularMarks,
    })),
  })),
}));

export const allFoodPreferenceItems = foodPreferencesCatalog.flatMap((group) =>
  group.subgroups.flatMap((subgroup) => subgroup.items)
);
