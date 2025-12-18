{% macro load_dim(dim_table, dim_type) %}

  {% set query %}
    SELECT  
        {{ dim_type }}_id AS id,
        {{ dim_type }}_name AS name,
        nemesis_name AS nemesis_name,
        {{ dim_type}} AS type
    FROM {{ dim_table }}
  {% endset %}

  {% set results = run_query(query) %}

  {{ return(results) }}

{% endmacro %}