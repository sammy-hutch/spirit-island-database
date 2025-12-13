{% macro load_seed(seed_file) %}

  {% set query %}
    SELECT * FROM {{ seed_file }}
  {% endset %}

  {% do run_query(query) %}

{% endmacro %}