# SubNetFlow

Protótipo web para calcular e organizar sub-redes IPv4 usando VLSM, desenvolvido em **HTML, CSS e JavaScript puro**.

O projeto é executado localmente no navegador e permite informar uma rede principal, definir a quantidade de hosts de cada setor e visualizar a distribuição das sub-redes.

## Funcionalidades

- Planejamento de sub-redes com VLSM.
- Prévia da capacidade da rede e dos endereços reservados.
- Exibição de rede, prefixo, máscara, faixa de hosts e broadcast.
- Salvamento, consulta, reabertura e exclusão de planejamentos.
- Busca no histórico e exportação dos resultados em CSV.
- Tema claro, escuro ou definido pelo sistema.
- Formulários de login e cadastro de demonstração.

## Tecnologias

- **HTML:** estrutura das páginas e formulários.
- **CSS:** aparência, responsividade e estados visuais.
- **JavaScript:** cálculos, validações, eventos e armazenamento local.

Não é necessário instalar dependências ou executar uma etapa de build para utilizar o sistema.

## Organização

Os caminhos abaixo são relativos à pasta `subnetflow`:

| Pasta ou arquivo | Responsabilidade |
| --- | --- |
| `assets/` | Recursos visuais do projeto. |
| `css/` | Estilos compartilhados e específicos de cada página. |
| `html/` | Telas de acesso, cálculo e histórico. |
| `js/` | Controladores das páginas, cálculos e serviços compartilhados. |
| `tests/` | Testes automatizados dos cálculos e serviços. |

| Página | Arquivo |
| --- | --- |
| Acesso | `html/inicio/index.html` |
| Calculadora | `html/calcular/calcular.html` |
| Histórico | `html/historico/historico.html` |

HTML, CSS e JavaScript ficam separados. O código utiliza indentação de quatro espaços e comentários curtos para explicar a responsabilidade dos blocos.

## Executar localmente

### Com Live Server

1. Abra a pasta `subnetflow` no VS Code.
2. Instale a extensão **Live Server**, caso ainda não tenha.
3. Localize `html/inicio/index.html`.
4. Clique com o botão direito nesse arquivo e selecione **Open with Live Server**.
5. Na tela de acesso, clique em **Experimentar demonstração** ou preencha os formulários com dados fictícios.

### Com Python

Se tiver Python instalado, abra um terminal dentro da pasta `subnetflow` e execute:

```bash
python -m http.server 5500 --bind 127.0.0.1
```

Depois, acesse:

[http://localhost:5500/html/inicio/index.html](http://localhost:5500/html/inicio/index.html)

**A tela inicial está dentro de `html/inicio/`; não há um `index.html` na raiz nesta estrutura.**

O projeto utiliza módulos JavaScript com `import` e `export`. Por isso, execute por um servidor local: abrir o HTML diretamente com duplo clique pode bloquear o carregamento dos scripts.

Node.js não é necessário para utilizar as telas. As fontes externas têm alternativas locais caso não possam ser carregadas.

## Como utilizar

1. Acesse a demonstração.
2. Informe a rede no formato IPv4/CIDR, como `192.168.10.0/24`.
3. Adicione os setores e suas quantidades de hosts.
4. Clique em **Calcular planejamento**.
5. Consulte os resultados e, se desejar, salve o plano ou exporte o CSV.
6. Acesse **Histórico** para buscar e reabrir os planejamentos salvos.

Alterar a rede ou os setores invalida o resultado anterior. Faça um novo cálculo antes de salvar ou exportar.

## Regras do planejamento

O cálculo utiliza redes LAN convencionais, reservando um endereço de rede e um de broadcast em cada sub-rede.

- Prefixos da rede principal: `/0` a `/30`.
- Menor sub-rede gerada: `/30`.
- Quantidade de hosts: números inteiros positivos, sujeitos à capacidade da rede.
- Os setores que precisam de blocos maiores são alocados primeiro.
- Endereços de hosts são normalizados para o endereço da rede correspondente.
- A ocupação considera todo o bloco reservado, incluindo rede, broadcast e folga.

Este planejador não gera blocos `/31` ou `/32`.

## Armazenamento e acesso

Esta versão funciona como **demonstração local**, sem backend ou banco de dados externo.

- A sessão de demonstração usa `sessionStorage`.
- O histórico e a preferência de tema usam `localStorage`.
- Os planejamentos são organizados pelo e-mail informado na demonstração.
- A aplicação não verifica credenciais nem armazena senhas.

A separação por e-mail organiza os registros; ela não representa autenticação ou proteção de acesso real.

Os dados ficam no navegador utilizado. Limpar os dados do site remove os registros locais. Trocar de navegador, endereço ou porta utiliza um armazenamento diferente.

## Testes

Os testes são opcionais para quem deseja verificar os cálculos e os serviços.

Com **Node.js 24 ou superior**, execute dentro da pasta `subnetflow`:

```bash
node --test tests/*.test.js
```

Esse comando não depende de `package.json` ou de instalação de pacotes. O Node.js 24 reconhece a sintaxe de módulos utilizada nos arquivos JavaScript.

## Objetivo

Servir como base de estudo e desenvolvimento de uma ferramenta visual para planejamento de sub-redes, com separação entre interface, regras de cálculo e armazenamento.
