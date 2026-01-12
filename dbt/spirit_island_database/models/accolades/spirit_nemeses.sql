-- depends_on: {{ ref('nemeses_base') }}
{%- set spirits_dim = load_dim('spirits_dim', 'spirit') %}

WITH
{%- for spirit in spirits_dim %}
    {{ nemesis_cte(spirit) }}

    {%- if not loop.last %}
    ,
    {%- endif %}

{%- endfor %}

{%- for spirit in spirits_dim %}
    SELECT * FROM "Nemesis to {{spirit.name}}"

    {%- if not loop.last %}
    UNION ALL
    {%- endif %}

{%- endfor %}