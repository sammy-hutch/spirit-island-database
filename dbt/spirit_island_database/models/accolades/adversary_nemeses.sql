-- depends_on: {{ ref('nemeses_base') }}
{%- set adversaries_dim = load_dim('adversaries_dim', 'adversary') %}

WITH
{%- for adversary in adversaries_dim %}
    {{ nemesis_cte(adversary) }}

    {%- if not loop.last %}
    ,
    {%- endif %}

{%- endfor %}

{%- for adversary in adversaries_dim %}
    SELECT * FROM "Nemesis to {{adversary.name}}"

    {%- if not loop.last %}
    UNION ALL
    {%- endif %}

{%- endfor %}