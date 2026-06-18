# UI Generator MCP server

MCP server for generating UI elements in a contrained widget defined in the custom UI library.

## 1. Core idea
The concept is to allow the developer that uses HexUI to define an agent-populated widget in
the UI. Instead of getting only walls of text in the ai response widget (classic LLM output),
this widget, that we are going to call 'LLM-UI-response', will allow the agent to add UI
elements to better illustrate and answer the user's needs. These elements will be very
simple at first and display only (no interactions yet for first iterations). They can be the
following:
- Data tables
- Plots (bar chart, scatter plot, circle chart, etc)
- schemas (basic schemas: shapes with text, arrows)
- markdown render
- etc
With strictly esthetic ones:
- Header
- Footer
- Div
- etc

These elements can be positionned and sized as in the custom-UI lib that the dev uses for the
deterministic UI for agents.

## 2. External preparation work
A custom LLM-defined widget will need some preparation work ahead in order to allow it in the
current context. I will need a YAML format in the same way as the custom UI for the LLM to
describe the UI with the listed elements, their sizes and positions. This format will need
validation and compilation pipeline like custom UI to be rendered dynamically inside the UI.
I also need to create the LLM-UI-response widget in itself in the custom UI for devs to
incorporate. For the new format and pipeline, I think a lot of elements already in the custom
UI library can be reused or at least copied for this new part.

## 3. MCP server
The way agents will be able to write UI inside this widget is by using an MCP server that will
be passed to the devs. The goal of this MCP server is to list available UI elements, rules and
validate YAML generated UI. The core functions inside this MCP will be:

- list_elements()
To list all the available UI elements and a quick description for each one

- describe_element(element_name)
To describe in more details all the specifications of element_name and how to
use it.

- list_rules()
To describe how the YAML format must be used, what are the constraints, the
possibilities, etc

- validate_ui(yaml_text)
To validate the agent generated yaml ui. The idea is to describe the synthax errors the best
way for the agent to understand and iterate better after. Once the validate_ui() function
returns {ok}, the agent can submit his UI to the front app.

The ui creation loop for an agent will look something like this

user prompt -> answering in plain text in memory -> seing ui MCP for creating UI and explaining
answer -> list_rules() -> list_elements() -> describe_elements() -> describe_elements() -> ... ->
validate_ui() -> validate_ui() -> ... -> output the ui according to the user prompt