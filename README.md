# SubNetFlow

Protótipo de planejamento de sub-redes IPv4 com VLSM, feito em **HTML, CSS e JavaScript puro**. A identidade visual do projeto original foi mantida, com ajustes na prévia, navegação e mensagens.

## Executar

1. Extraia o ZIP completo.
2. Abra a pasta `subnetflow` no VS Code.
3. Com a extensão **Live Server**, abra o `index.html` da raiz usando **Open with Live Server**.
4. Clique em **Experimentar demonstração** ou preencha os formulários com dados fictícios.

Outra opção, se Python estiver instalado, é executar na pasta `subnetflow`:

```bash
python -m http.server 5500
```

Acesse `http://localhost:5500`.

O projeto utiliza módulos nativos de JavaScript (`import` e `export`). Por isso, precisa ser servido por HTTP; abrir os arquivos internos diretamente com `file://` bloqueia o carregamento dos módulos em navegadores comuns. O `index.html` da raiz mostra essa orientação quando aberto com duplo clique.

**Não há build, framework ou instalação de pacotes para usar o sistema.** Node.js é necessário apenas se você quiser executar os testes. As fontes do Google são opcionais: quando indisponíveis, o navegador usa fontes locais.

## Organização das pastas

A organização é horizontal por tecnologia, com páginas separadas dentro de cada camada. Os nomes de pastas usam letras minúsculas, sem espaços ou acentos.

| Caminho | Responsabilidade |
| --- | --- |
| `index.html` | Ponto de entrada; encaminha para a tela inicial. |
| `html/inicio/index.html` | Acesso e cadastro de demonstração. |
| `html/calcular/calcular.html` | Formulário, prévia, resultados e explicação do cálculo. |
| `html/historico/historico.html` | Busca, abertura e exclusão de planos salvos. |
| `css/base.css` | Cores, tipografia, acessibilidade e regras básicas. |
| `css/componentes.css` | Cabeçalho, conta, botões, mensagens e diálogos compartilhados. |
| `css/inicio/style.css` | Estilos exclusivos da tela inicial. |
| `css/calcular/calcular.css` | Estilos exclusivos da calculadora. |
| `css/historico/historico.css` | Estilos exclusivos do histórico. |
| `js/entrada.js` | Encaminhamento da página raiz. |
| `js/inicio/inicio.js` | Eventos e validações dos formulários de acesso. |
| `js/calcular/calcular.js` | Eventos da calculadora e preenchimento dos resultados. |
| `js/historico/historico.js` | Eventos, filtros e confirmações do histórico. |
| `js/core/ipv4.js` | Conversão de endereços, máscaras e validação da rede. |
| `js/core/vlsm.js` | Dimensionamento, alocação e resumo das sub-redes. |
| `js/servicos/armazenamento.js` | Leitura e escrita dos dados locais, com tratamento de falhas. |
| `js/servicos/sessao.js` | Sessão de demonstração. |
| `js/servicos/historico.js` | Persistência de planejamentos por e-mail. |
| `js/servicos/exportacao.js` | Geração e download de CSV. |
| `js/compartilhado/tema.js` | Preferência de tema claro, escuro ou do sistema. |
| `js/compartilhado/interface.js` | Menu da conta, perfil, configurações e mensagens. |
| `assets/` | Favicon e fluxograma original, preservado. |
| `tests/` | Testes automatizados de cálculo e serviços. |

## Padrão de código

- Recuo de quatro espaços, blocos abertos em linhas legíveis e comentários curtos por responsabilidade.
- **HTML:** estrutura, textos fixos, formulários e elementos `<template>` reutilizados pela interface.
- **CSS:** cores, espaçamentos, estados visuais, responsividade e animações.
- **JavaScript:** cálculos, eventos, validações, preenchimento de dados e armazenamento.
- Sem atributos `style`, blocos `<style>`, eventos `onclick` ou scripts embutidos no HTML.
- Sem montagem de telas por `innerHTML` nem atribuições de aparência por `.style` no JavaScript.
- Conteúdo dinâmico é inserido por `textContent`; classes, `hidden`, `data-*` e atributos ARIA representam estados.
- O mapa usa SVG: o JavaScript fornece posições e larguras proporcionais aos dados, enquanto o CSS define as cores e a aparência.

O arquivo `.editorconfig` mantém o mesmo padrão de recuo e codificação nos editores que o reconhecem.

## Correções e melhorias

| Problema no original | Comportamento atual |
| --- | --- |
| “Salvar rede” chamava `longToIp`, que não existia, e lia campos incorretos. | Salva a rede normalizada e todos os setores necessários para reabrir o cálculo. |
| O aproveitamento do histórico usava `result.usable`, ausente nos resultados. | Usa a capacidade utilizável real das sub-redes. |
| A prévia subtraía apenas a quantidade de hosts. | Considera blocos completos, incluindo rede, broadcast e folga, e avisa quando não cabem. |
| Editar campos ou carregar um exemplo deixava um resultado antigo disponível para salvar/exportar. | Qualquer edição invalida o resultado até um novo cálculo. |
| Registros e exemplos apareciam em um histórico global. | Cada e-mail de demonstração possui seu próprio histórico local, inicialmente vazio. |
| Não era possível reabrir um cálculo salvo. | O botão **Abrir** recupera rede, setores e resultados. |
| O tema se perdia entre as páginas. | A preferência é persistida, com opção de acompanhar o sistema. |
| Os links de navegação desapareciam no celular. | A navegação possui uma segunda linha em telas menores. |
| O histórico interpretava dados salvos como HTML. | Os valores são exibidos como texto. |
| Falhas de armazenamento não eram apresentadas ao usuário. | Erros são informados; dados corrompidos não são sobrescritos silenciosamente. |
| Cadastro ignorava campos vazios e confirmação de senha. | Os formulários validam os campos e a confirmação. |
| Perfil e configurações mostravam apenas alertas de implementação futura. | Diálogos exibem o perfil de demonstração e as preferências de tema. |

A exportação CSV preserva acentos, escapa aspas e trata nomes iniciados como fórmulas para reduzir o risco de interpretação pelo Excel. A exclusão de registros exige confirmação na interface.

## Regras do cálculo

Este protótipo planeja **redes LAN IPv4 convencionais**, mantendo a regra do original: cada sub-rede reserva um endereço de rede e um de broadcast.

- Rede principal: prefixos de `/0` a `/30`.
- Menor bloco gerado: `/30`, mesmo quando o setor solicita apenas um host.
- Um endereço de host é normalizado para sua rede: `192.168.1.50/26` corresponde a `192.168.1.0/26`.
- Os maiores blocos são alocados primeiro. Empates preservam a ordem de entrada.
- Hosts: inteiros de `1` a `4.294.967.294`, sujeitos à capacidade da rede informada.
- Limite de interface: 256 setores por planejamento.
- `/31` e `/32` têm uma mensagem específica sobre o escopo; não são tratados como prefixos IPv4 inexistentes. O uso de `/31` em enlaces ponto a ponto é definido pela [RFC 3021](https://www.rfc-editor.org/rfc/rfc3021.html).

Exemplo inicial:

| Setor | Hosts pedidos | Sub-rede | Hosts utilizáveis |
| --- | ---: | --- | ---: |
| Administrativo | 50 | `192.168.10.0/26` | 62 |
| Financeiro | 25 | `192.168.10.64/27` | 30 |
| Tecnologia | 10 | `192.168.10.96/28` | 14 |
| Servidores | 2 | `192.168.10.112/30` | 2 |

São **87 hosts solicitados**, **116 endereços reservados**, **108 hosts utilizáveis nos blocos** e **140 endereços ainda livres**. O aproveitamento é `87 ÷ 108`, arredondado para **81%**.

O cálculo representa a divisão matemática. Não verifica se uma faixa é apropriada para uso em uma rede real ou se já está ocupada por outro equipamento.

## Dados e limites da demonstração

**O login não é autenticação real.** Não há backend, conferência de senha, recuperação de conta ou isolamento de segurança. As senhas preenchidas não são armazenadas pela aplicação. Informar o mesmo e-mail permite acessar o mesmo histórico neste navegador.

A sessão usa `sessionStorage`, e os planos usam `localStorage`, na chave `subnetflow_history_v2:<email>`. O tema utiliza `subnetflow_theme`.

Os dados dependem do navegador e da origem do site. Mudar entre `localhost` e `127.0.0.1`, mudar a porta, trocar de navegador ou limpar os dados do site pode fazer o histórico parecer vazio. Isso não é sincronização com uma conta real.

A chave antiga `subnetflow_demo_history` foi preservada. Seus registros não são importados automaticamente, pois o formato original não indicava a conta proprietária nem guardava os setores completos para reconstruir os cálculos.

Para uma versão de produção, o backend deverá autenticar os usuários, autorizar o acesso a cada plano e validar novamente os dados. A separação em serviços permite substituir o armazenamento local por chamadas à API sem misturar isso ao algoritmo de VLSM.

## Testes

Com **Node.js 20 ou superior**, execute na raiz do projeto:

```bash
npm test
```

Não é necessário executar `npm install`: os 20 testes incluídos utilizam somente módulos nativos do Node.js.

Eles verificam endereços e máscaras, normalização, fronteiras de capacidade, `/0`, último bloco IPv4, ordenação, ausência de sobreposição, salvamento e reabertura, separação dos históricos, falhas de armazenamento, sessão e CSV.

Também foram executadas, durante esta revisão, **45 verificações adicionais em DOM simulado**, cobrindo integração dos formulários, prévia, resultados, gravação, reabertura, filtros, exclusão, tema e tratamento de conteúdo como texto. Esse ensaio utilizou uma ferramenta externa de desenvolvimento e não é necessário para executar o projeto.

Os caminhos locais, imports, IDs, rótulos e sintaxe JavaScript foram conferidos. A inspeção visual em um navegador real não foi concluída: o navegador de verificação bloqueou o acesso ao servidor local do ambiente. O DOM simulado não valida dimensões, cores ou posicionamento.

## Adicionar uma nova tela

1. Crie o HTML em `html/nome-da-tela/`.
2. Crie o CSS específico em `css/nome-da-tela/`.
3. Crie o controlador em `js/nome-da-tela/`.
4. Inclua `base.css`, `componentes.css` e o CSS da tela.
5. Carregue o controlador usando `<script type="module" src="...">`.
6. Reutilize os serviços e as funções de `js/core` por imports.

O cabeçalho e os diálogos aparecem nos dois HTML internos para manter a estrutura visual no HTML, sem gerá-la em strings JavaScript. Se o número de páginas crescer muito, um mecanismo de templates durante o build pode eliminar essa repetição.
