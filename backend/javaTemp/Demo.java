import java.util.*;

class Demo {
    public static void main(String[] args) {
        HashMap<String, Integer> map = new HashMap<>();
        
        // Add
        map.put("Satyam", 90);
        map.put("Rahul", 80);
        
        // Get
        System.out.println(map.get("Satyam"));
        
        // Check
        System.out.println(map.containsKey("Rahul"));
        
        // Remove
        map.remove("Rahul");
        
        // Loop
        for(String key : map.keySet()) {
            System.out.println(key + " " + map.get(key));
        }
    }
}