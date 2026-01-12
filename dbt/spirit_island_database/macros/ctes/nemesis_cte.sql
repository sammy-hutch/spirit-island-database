{% macro nemesis_cte(nemesis)%}

{%- if nemesis.type == 'spirit' %}
    {%- set recipient_type = 'adversary' %}
    {%- set agg_func = 'MIN' %}
    {%- set order_cond_1 = 'loss' %}
    {%- set order_func_1 = 'ASC' %}
    {%- set order_cond_2 = 'win' %}
    {%- set order_func_2 = 'ASC' %}
{%- else %}
    {%- set recipient_type = 'spirit' %}
    {%- set agg_func = 'MAX' %}
    {%- set order_cond_1 = 'win' %}
    {%- set order_func_1 = 'DESC' %}
    {%- set order_cond_2 = 'loss' %}
    {%- set order_func_2 = 'DESC' %}
{%- endif %}

"Nemesis to {{nemesis.name}}" AS (
    select
        "{{nemesis.type}}_nemesis_{{nemesis.id}}" AS accolade_id,
        "{{nemesis.nemesis_name}}" AS accolade_name,
        "Nemesis to {{nemesis.name}}" AS accolade_description,
        {{recipient_type}}_name AS accolade_recipient
    from {{ ref('nemeses_base') }}
    where 
        {{nemesis.type}}_id = {{nemesis.id}}
        AND win_rate = (
            select {{agg_func}}(win_rate)
            from {{ ref('nemeses_base') }}
            where {{nemesis.type}}_id = {{nemesis.id}}
        )
    order by 
        avg_{{order_cond_1}}_score {{order_func_1}},
        avg_{{order_cond_2}}_score {{order_func_2}}
    limit 1
)

{% endmacro %}