package vn.synera.catalog;

import java.util.*;
import vn.synera.catalog.domain.Organization;

/** Sales coverage is separate from legacy departments and the NPP's commercial region. */
final class DistributionHierarchy {
  static final List<String> LEVELS = List.of("NSX", "NPP", "REGION", "PROVINCE", "SALES_REGION");
  static final Set<String> REGIONS = Set.of("NORTH", "CENTRAL", "SOUTH");

  static List<Organization> path(Map<Long, Organization> nodes, Long id) {
    var path = new ArrayList<Organization>();
    var seen = new HashSet<Long>();
    while (id != null) {
      if (!seen.add(id) || !nodes.containsKey(id)) return List.of();
      var node = nodes.get(id);
      path.add(node);
      id = node.parentId;
    }
    Collections.reverse(path);
    return path;
  }

  static boolean valid(Map<Long, Organization> nodes, Long id) {
    var path = path(nodes, id);
    if (path.isEmpty() || path.size() > LEVELS.size()) return false;
    for (int i = 0; i < path.size(); i++) {
      if (!LEVELS.get(i).equals(path.get(i).type)) return false;
      if (i >= 2
          && (!REGIONS.contains(path.get(i).region)
              || !path.get(2).region.equals(path.get(i).region))) return false;
    }
    return true;
  }

  static Long owner(Map<Long, Organization> nodes, Long id) {
    for (var node : path(nodes, id)) if ("NPP".equals(node.type)) return node.id;
    return null;
  }

  static boolean area(Map<Long, Organization> nodes, Long id, Long npp) {
    return valid(nodes, id)
        && "SALES_REGION".equals(nodes.get(id).type)
        && Objects.equals(owner(nodes, id), npp);
  }

  private DistributionHierarchy() {}
}
