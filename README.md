#About trackReading
Goal of this Codeset is to Measure if users of a website are actually reading the presented content.
This is inferred by scrolling behaviour.

#Licence
see LICENCE

#Usage
Usage example:
```
<script>
performancetracking.jQuery = $;
$(document).ready(function() {
  performancetracking.trackReading(performancetracking.trackReading.debug_ga, '#readTest');
});
</script>
```
jQuery is required.

The js Code is Closure Compiler compatible. 

Feel free to define your own tracking callback.

See also: [Performancetracking.de Article](http://performancetracking.de/2012/06/05/lesen-eines-artikels-als-conversion-messen)