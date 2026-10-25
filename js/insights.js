(() => {
    "use strict";

    const API = window.TianguisNegocios;
    const DB = window.TianguisDB;
    const SVG_NS = "http://www.w3.org/2000/svg";
    const CATEGORY_LABELS = {
        ropa: "Ropa",
        "comida preparada": "Comida preparada",
        "carne / pollo / pescado crudo": "Carne, pollo y pescado",
        "fruta / verdura": "Fruta y verdura",
        juguetes: "Juguetes",
        cremería: "Cremería",
        libros: "Libros",
        "tiendas de catálogo": "Tiendas de catálogo",
        electrónica: "Electrónica",
        antigüedad: "Antigüedades",
        otros: "Otros"
    };
    const elements = {};
    let analytics = null;

    function normalizeCategory(value) {
        return String(value || "otro").trim().toLocaleLowerCase("es");
    }

    function productCategoryLabel(value) {
        const normalized = normalizeCategory(value);
        return CATEGORY_LABELS[normalized]
            || API.etiquetaCategoria(normalized)
            || "Otros";
    }

    function validPrice(price) {
        const amount = Number(price);
        return price !== null && price !== "" && Number.isFinite(amount) && amount >= 0
            ? amount
            : null;
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN",
            maximumFractionDigits: 0
        }).format(Number.isFinite(value) ? value : 0);
    }

    function getCoordinates(markets) {
        const count = markets.length;
        return markets.map((market, index) => {
            const angle = (2 * Math.PI * index / Math.max(count, 1)) - Math.PI / 2;
            return {
                ...market,
                graphX: Number.isFinite(Number(market.x))
                    ? Number(market.x)
                    : 50 + 42 * Math.cos(angle),
                graphY: Number.isFinite(Number(market.y))
                    ? Number(market.y)
                    : 50 + 42 * Math.sin(angle)
            };
        });
    }

    function getDistance(left, right) {
        return Math.hypot(left.graphX - right.graphX, left.graphY - right.graphY);
    }

    function buildAnalytics(tables) {
        const markets = getCoordinates(tables.markets);
        const marketById = new Map(markets.map(market => [market.id, market]));
        const marketIdByName = new Map(markets.map(market => [
            String(market.name).trim().toLocaleLowerCase("es"),
            market.id
        ]));
        const businessById = new Map(tables.businesses.map(business => [business.id, business]));
        const businessesByMarket = new Map(markets.map(market => [market.id, []]));
        const productsByMarket = new Map(markets.map(market => [market.id, []]));
        const productsByCategory = new Map();
        const complaints = Array.isArray(tables.denuncias) ? tables.denuncias : [];
        const complaintsByMarket = new Map(markets.map(market => [market.id, 0]));
        const complaintsByType = new Map();
        let unassignedComplaints = 0;

        complaints.forEach(complaint => {
            const marketId = complaint.marketId || marketIdByName.get(
                String(complaint.marketName || complaint.tianguis || "")
                    .trim()
                    .toLocaleLowerCase("es")
            );
            const type = String(complaint.type || complaint.tipo || "").trim()
                || "Sin categoría";

            complaintsByType.set(type, (complaintsByType.get(type) || 0) + 1);
            if (complaintsByMarket.has(marketId)) {
                complaintsByMarket.set(marketId, complaintsByMarket.get(marketId) + 1);
            } else {
                unassignedComplaints++;
            }
        });

        const complaintTypes = [...complaintsByType.entries()]
            .map(([label, count]) => ({ label, count }))
            .sort((left, right) =>
                right.count - left.count || left.label.localeCompare(right.label, "es")
            );
        const complaintMarkets = markets.map(market => ({
            id: market.id,
            name: market.name,
            count: complaintsByMarket.get(market.id) || 0
        })).sort((left, right) =>
            right.count - left.count || left.name.localeCompare(right.name, "es")
        );

        tables.businesses.forEach(business => {
            const marketId = business.marketId || "";
            if (!businessesByMarket.has(marketId)) businessesByMarket.set(marketId, []);
            businessesByMarket.get(marketId).push(business);
        });

        tables.products.forEach(product => {
            const business = businessById.get(product.businessId);
            const marketId = product.marketId || business?.marketId || "";
            const category = productCategoryLabel(product.category);

            if (!productsByMarket.has(marketId)) productsByMarket.set(marketId, []);
            productsByMarket.get(marketId).push(product);

            productsByCategory.set(category, (productsByCategory.get(category) || 0) + 1);
        });

        const nodes = markets.map(market => {
            const businesses = businessesByMarket.get(market.id) || [];
            const products = productsByMarket.get(market.id) || [];
            const businessCategories = new Map();

            businesses.forEach(business => {
                const category = normalizeCategory(business.category);
                businessCategories.set(category, (businessCategories.get(category) || 0) + 1);
            });

            const listedValue = products.reduce((sum, product) => {
                const price = validPrice(product.price);
                return price === null || product.availability === "agotado"
                    ? sum
                    : sum + price;
            }, 0);
            const pricedProducts = products.filter(product =>
                validPrice(product.price) !== null && product.availability !== "agotado"
            ).length;

            return {
                ...market,
                businesses,
                products,
                businessCategories,
                businessCount: businesses.length,
                productCount: products.length,
                complaintCount: complaintsByMarket.get(market.id) || 0,
                listedValue,
                pricedProducts,
                categories: new Set(businessCategories.keys())
            };
        });

        const edges = [];
        for (let leftIndex = 0; leftIndex < nodes.length; leftIndex++) {
            for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex++) {
                const left = nodes[leftIndex];
                const right = nodes[rightIndex];
                const sharedCategories = [...left.categories]
                    .filter(category => right.categories.has(category));

                if (!sharedCategories.length) continue;

                const weight = sharedCategories.reduce((sum, category) =>
                    sum +
                    (left.businessCategories.get(category) || 0) +
                    (right.businessCategories.get(category) || 0),
                0);

                edges.push({
                    source: left.id,
                    target: right.id,
                    weight,
                    sharedCategories,
                    distance: getDistance(left, right)
                });
            }
        }

        const categories = [...productsByCategory.entries()]
            .map(([label, count]) => ({ label, count }))
            .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "es"));
        const pricedProducts = tables.products.filter(product =>
            validPrice(product.price) !== null && product.availability !== "agotado"
        );
        const listedValue = pricedProducts.reduce((sum, product) =>
            sum + validPrice(product.price),
        0);

        return {
            markets: nodes,
            businesses: tables.businesses,
            products: tables.products,
            complaints,
            complaintTypes,
            complaintMarkets,
            unassignedComplaints,
            totalComplaints: complaints.length,
            topComplaintType: complaintTypes[0] || null,
            topComplaintMarket: complaintMarkets.find(market => market.count > 0) || null,
            edges,
            categories,
            listedValue,
            pricedProductCount: pricedProducts.length,
            demoBusinessCount: tables.businesses.filter(business => business.isDemo).length,
            registeredBusinessCount: tables.businesses.filter(business => !business.isDemo).length,
            cycleCount: countTriangles(nodes, edges),
            strongestEdge: edges.slice().sort((left, right) =>
                right.weight - left.weight || left.distance - right.distance
            )[0] || null
        };
    }

    function countTriangles(nodes, edges) {
        const adjacency = new Map(nodes.map(node => [node.id, new Set()]));
        edges.forEach(edge => {
            adjacency.get(edge.source)?.add(edge.target);
            adjacency.get(edge.target)?.add(edge.source);
        });

        let cycles = 0;
        for (let first = 0; first < nodes.length; first++) {
            for (let second = first + 1; second < nodes.length; second++) {
                if (!adjacency.get(nodes[first].id)?.has(nodes[second].id)) continue;
                for (let third = second + 1; third < nodes.length; third++) {
                    if (
                        adjacency.get(nodes[first].id)?.has(nodes[third].id) &&
                        adjacency.get(nodes[second].id)?.has(nodes[third].id)
                    ) {
                        cycles++;
                    }
                }
            }
        }
        return cycles;
    }

    function findShortestRoute(nodes, edges, originId, destinationId) {
        const nodeById = new Map(nodes.map(node => [node.id, node]));
        if (!nodeById.has(originId) || !nodeById.has(destinationId)) return null;
        if (originId === destinationId) {
            return { nodeIds: [originId], distance: 0 };
        }

        const distances = new Map(nodes.map(node => [node.id, Infinity]));
        const previous = new Map();
        const pending = new Set(nodes.map(node => node.id));
        distances.set(originId, 0);

        while (pending.size) {
            let currentId = null;
            let currentDistance = Infinity;
            pending.forEach(id => {
                const distance = distances.get(id);
                if (distance < currentDistance) {
                    currentId = id;
                    currentDistance = distance;
                }
            });

            if (currentId === null || !Number.isFinite(currentDistance)) break;
            if (currentId === destinationId) break;
            pending.delete(currentId);

            edges.forEach(edge => {
                let neighborId = null;
                if (edge.source === currentId) neighborId = edge.target;
                if (edge.target === currentId) neighborId = edge.source;
                if (!neighborId || !pending.has(neighborId)) return;

                const candidate = currentDistance + edge.distance;
                if (candidate < distances.get(neighborId)) {
                    distances.set(neighborId, candidate);
                    previous.set(neighborId, currentId);
                }
            });
        }

        if (!Number.isFinite(distances.get(destinationId))) return null;

        const nodeIds = [];
        let currentId = destinationId;
        while (currentId) {
            nodeIds.unshift(currentId);
            if (currentId === originId) break;
            currentId = previous.get(currentId);
        }

        if (nodeIds[0] !== originId) return null;
        return { nodeIds, distance: distances.get(destinationId) };
    }

    function estimateEconomicImpact(analyticsData, unitsPerProductPerDay) {
        const units = Math.max(0, Number(unitsPerProductPerDay) || 0);
        return {
            daily: analyticsData.listedValue * units,
            weekly: analyticsData.listedValue * units * 7,
            monthly: analyticsData.listedValue * units * 30,
            unitsPerProductPerDay: units,
            pricedProductCount: analyticsData.pricedProductCount
        };
    }

    function svgElement(name, attributes = {}) {
        const element = document.createElementNS(SVG_NS, name);
        Object.entries(attributes).forEach(([attribute, value]) => {
            element.setAttribute(attribute, String(value));
        });
        return element;
    }

    function renderGraph() {
        const svg = elements.networkGraph;
        svg.replaceChildren();
        svg.setAttribute("viewBox", "0 0 760 360");
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

        if (!analytics.markets.length) {
            const message = svgElement("text", { x: 380, y: 180, "text-anchor": "middle" });
            message.textContent = "No hay mercados para visualizar.";
            svg.appendChild(message);
            return;
        }

        const paddingX = 100;
        const paddingY = 55;
        const xs = analytics.markets.map(market => market.graphX);
        const ys = analytics.markets.map(market => market.graphY);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const positions = new Map(analytics.markets.map(market => [
            market.id,
            {
                x: paddingX + ((market.graphX - minX) / Math.max(1, maxX - minX)) * (760 - paddingX * 2),
                y: paddingY + ((market.graphY - minY) / Math.max(1, maxY - minY)) * (360 - paddingY * 2)
            }
        ]));
        const maxWeight = Math.max(1, ...analytics.edges.map(edge => edge.weight));

        analytics.edges.forEach(edge => {
            const source = positions.get(edge.source);
            const target = positions.get(edge.target);
            const lineWidth = 1.5 + 4 * (edge.weight / maxWeight);
            const line = svgElement("line", {
                x1: source.x,
                y1: source.y,
                x2: target.x,
                y2: target.y,
                class: "network-edge",
                "stroke-width": lineWidth
            });
            const title = svgElement("title");
            const shared = edge.sharedCategories
                .map(category => API.etiquetaCategoria(category))
                .join(", ");
            const sourceMarket = analytics.markets.find(market => market.id === edge.source);
            const targetMarket = analytics.markets.find(market => market.id === edge.target);
            title.textContent =
                `${sourceMarket.name} ↔ ${targetMarket.name}; peso: ${edge.weight} puestos en giros compartidos (${shared}); distancia esquemática: ${edge.distance.toFixed(1)} unidades`;
            line.appendChild(title);
            svg.appendChild(line);

            const edgeLabel = svgElement("text", {
                x: (source.x + target.x) / 2,
                y: (source.y + target.y) / 2 - 4,
                class: "network-edge-label",
                "text-anchor": "middle"
            });
            edgeLabel.textContent = String(edge.weight);
            svg.appendChild(edgeLabel);
        });

        const maxProducts = Math.max(1, ...analytics.markets.map(market => market.productCount));
        analytics.markets.forEach(market => {
            const position = positions.get(market.id);
            const radius = 12 + 12 * Math.sqrt(market.productCount / maxProducts);
            const group = svgElement("g", {
                class: "network-node",
                tabindex: "0",
                role: "button",
                "aria-label": `${market.name}, ${market.businessCount} negocios, ${market.productCount} productos`
            });
            const title = svgElement("title");
            title.textContent = `${market.name}: ${market.businessCount} negocios y ${market.productCount} productos`;
            group.appendChild(title);
            group.appendChild(svgElement("circle", {
                cx: position.x,
                cy: position.y,
                r: radius
            }));

            const countLabel = svgElement("text", {
                x: position.x,
                y: position.y + 3,
                class: "node-count"
            });
            countLabel.textContent = String(market.productCount);
            group.appendChild(countLabel);

            const nameLabel = svgElement("text", {
                x: position.x,
                y: position.y + radius + 15
            });
            nameLabel.textContent = market.name
                .replace(/^Tianguis\s+/i, "")
                .replace(/^Mercado de\s+/i, "")
                .replace(/^Mercado\s+/i, "")
                .slice(0, 24);
            group.appendChild(nameLabel);

            const chooseOrigin = () => {
                elements.routeOrigin.value = market.id;
                updateRoute();
            };
            group.addEventListener("click", chooseOrigin);
            group.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    chooseOrigin();
                }
            });
            svg.appendChild(group);
        });
    }

    function populateRoutes() {
        const options = analytics.markets.map(market => {
            const option = document.createElement("option");
            option.value = market.id;
            option.textContent = market.name;
            return option;
        });

        [elements.routeOrigin, elements.routeDestination].forEach(select => {
            select.replaceChildren(...options.map(option => option.cloneNode(true)));
        });

        if (analytics.markets.length > 1) {
            elements.routeOrigin.value = analytics.markets[0].id;
            elements.routeDestination.value = analytics.markets[analytics.markets.length - 1].id;
        }
    }

    function updateRoute() {
        if (!analytics.markets.length) {
            elements.routeResult.textContent = "No hay mercados para calcular una ruta.";
            return;
        }

        const route = findShortestRoute(
            analytics.markets,
            analytics.edges,
            elements.routeOrigin.value,
            elements.routeDestination.value
        );

        if (!route) {
            elements.routeResult.textContent =
                "No existe una ruta por giros compartidos entre esos mercados.";
            return;
        }

        const names = route.nodeIds.map(id =>
            analytics.markets.find(market => market.id === id)?.name || id
        );
        elements.routeResult.textContent = route.nodeIds.length === 1
            ? `${names[0]} · distancia 0 unidades`
            : `${names.join(" → ")} · ${route.distance.toFixed(1)} unidades esquemáticas`;
    }

    function renderCategories() {
        elements.categoryChart.replaceChildren();
        const maximum = Math.max(1, ...analytics.categories.map(category => category.count));

        if (!analytics.categories.length) {
            const empty = document.createElement("p");
            empty.className = "empty-chart";
            empty.textContent = "No hay productos en el catálogo.";
            elements.categoryChart.appendChild(empty);
            return;
        }

        analytics.categories.forEach(category => {
            const row = document.createElement("div");
            row.className = "category-row";

            const label = document.createElement("span");
            label.className = "category-label";
            label.title = category.label;
            label.textContent = category.label;

            const track = document.createElement("div");
            track.className = "category-track";
            track.setAttribute("aria-hidden", "true");

            const bar = document.createElement("div");
            bar.className = "category-bar";
            bar.style.width = `${(category.count / maximum) * 100}%`;
            track.appendChild(bar);

            const count = document.createElement("span");
            count.className = "category-count";
            count.textContent = String(category.count);

            row.append(label, track, count);
            elements.categoryChart.appendChild(row);
        });
    }

    function renderMarketTable(unitsPerProduct) {
        elements.marketTableBody.replaceChildren();
        const sortedMarkets = analytics.markets.slice().sort((left, right) =>
            right.productCount - left.productCount ||
            right.businessCount - left.businessCount ||
            left.name.localeCompare(right.name, "es")
        );

        sortedMarkets.forEach(market => {
            const row = document.createElement("tr");
            const categories = [...new Set(market.products.map(product =>
                productCategoryLabel(product.category)
            ))].sort((left, right) => left.localeCompare(right, "es"));
            const values = [
                market.name,
                String(market.businessCount),
                String(market.productCount),
                categories.length ? categories.join(", ") : "—",
                formatCurrency(market.listedValue),
                formatCurrency(market.listedValue * unitsPerProduct)
            ];

            values.forEach(value => {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            });
            elements.marketTableBody.appendChild(row);
        });

        if (!sortedMarkets.length) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.className = "table-empty";
            cell.colSpan = "6";
            cell.textContent = "No hay mercados registrados.";
            row.appendChild(cell);
            elements.marketTableBody.appendChild(row);
        }
    }

    function renderEconomicEstimate() {
        const unitsPerProduct = Math.max(0, Number(elements.dailyUnits.value) || 0);
        const estimate = estimateEconomicImpact(analytics, unitsPerProduct);
        elements.dailyEstimate.textContent = formatCurrency(estimate.daily);
        elements.weeklyEstimate.textContent = formatCurrency(estimate.weekly);
        elements.monthlyEstimate.textContent = formatCurrency(estimate.monthly);
        elements.pricedProductsNote.textContent =
            `${estimate.pricedProductCount} de ${analytics.products.length} productos tienen precio publicable`;
        renderMarketTable(unitsPerProduct);
    }

    function renderComplaints() {
        elements.complaintTotal.textContent = String(analytics.totalComplaints);
        elements.complaintTotalDetail.textContent = analytics.unassignedComplaints
            ? `${analytics.unassignedComplaints} sin mercado asociado`
            : "registradas en el sistema";
        elements.complaintTopType.textContent = analytics.topComplaintType?.label
            || "Sin denuncias";
        elements.complaintTopTypeDetail.textContent = analytics.topComplaintType
            ? `${analytics.topComplaintType.count} registro(s)`
            : "Aún no hay motivos registrados.";
        elements.complaintTopMarket.textContent = analytics.topComplaintMarket?.name
            || "Sin denuncias";
        elements.complaintTopMarketDetail.textContent = analytics.topComplaintMarket
            ? `${analytics.topComplaintMarket.count} registro(s)`
            : "Aún no hay mercados con denuncias.";

        elements.complaintTypeChart.replaceChildren();
        const maximum = Math.max(1, ...analytics.complaintTypes.map(type => type.count));
        if (!analytics.complaintTypes.length) {
            const empty = document.createElement("p");
            empty.className = "empty-chart";
            empty.textContent = "No hay denuncias registradas.";
            elements.complaintTypeChart.appendChild(empty);
        } else {
            analytics.complaintTypes.forEach(type => {
                const row = document.createElement("div");
                row.className = "category-row";
                const label = document.createElement("span");
                label.className = "category-label";
                label.title = type.label;
                label.textContent = type.label;
                const track = document.createElement("div");
                track.className = "category-track";
                track.setAttribute("aria-hidden", "true");
                const bar = document.createElement("div");
                bar.className = "complaint-bar";
                bar.style.width = `${(type.count / maximum) * 100}%`;
                track.appendChild(bar);
                const count = document.createElement("span");
                count.className = "category-count";
                count.textContent = String(type.count);
                row.append(label, track, count);
                elements.complaintTypeChart.appendChild(row);
            });
        }

        elements.complaintMarketTable.replaceChildren();
        analytics.complaintMarkets.forEach(market => {
            const row = document.createElement("tr");
            [market.name, String(market.count)].forEach(value => {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            });
            elements.complaintMarketTable.appendChild(row);
        });

        if (!analytics.complaintMarkets.length) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.className = "table-empty";
            cell.colSpan = "2";
            cell.textContent = "No hay mercados registrados.";
            row.appendChild(cell);
            elements.complaintMarketTable.appendChild(row);
        }
    }

    function render() {
        const tables = {
            markets: DB.obtenerTabla("markets"),
            businesses: DB.obtenerTabla("businesses"),
            products: DB.obtenerTabla("products"),
            denuncias: DB.obtenerTabla("denuncias")
        };
        analytics = buildAnalytics(tables);

        elements.kpiMarkets.textContent = String(analytics.markets.length);
        elements.kpiMarketsDetail.textContent = "en la red";
        elements.kpiProducts.textContent = String(analytics.products.length);
        elements.kpiProductsDetail.textContent = "en catálogo";
        elements.kpiBusinesses.textContent = String(analytics.businesses.length);
        elements.kpiBusinessesDetail.textContent =
            `${analytics.registeredBusinessCount} registrados · ${analytics.demoBusinessCount} de demostración`;
        elements.kpiListedValue.textContent = formatCurrency(analytics.listedValue);
        elements.networkEdges.textContent = String(analytics.edges.length);
        elements.networkCycles.textContent = String(analytics.cycleCount);

        if (analytics.strongestEdge) {
            const left = analytics.markets.find(market => market.id === analytics.strongestEdge.source);
            const right = analytics.markets.find(market => market.id === analytics.strongestEdge.target);
            elements.strongestLink.textContent =
                `${left.name.replace(/^Tianguis\s+/i, "")} ↔ ${right.name.replace(/^Tianguis\s+/i, "")}`;
            elements.strongestLinkDetail.textContent =
                `peso ${analytics.strongestEdge.weight} · ${analytics.strongestEdge.distance.toFixed(1)} unidades`;
        } else {
            elements.strongestLink.textContent = "Sin enlaces";
            elements.strongestLinkDetail.textContent = "No hay giros compartidos entre mercados.";
        }

        elements.dataStatus.textContent = "Base local lista";
        elements.updatedAt.textContent =
            `Vista generada: ${new Intl.DateTimeFormat("es-MX", {
                dateStyle: "medium",
                timeStyle: "short"
            }).format(new Date())}`;

        renderGraph();
        populateRoutes();
        renderCategories();
        renderEconomicEstimate();
        renderComplaints();
        updateRoute();
    }

    function showError(error) {
        elements.dashboardError.textContent =
            `No se pudieron calcular los insights: ${error.message}`;
        elements.dashboardError.classList.remove("hidden");
        elements.dataStatus.textContent = "Error de carga";
    }

    function exposeAnalyticsFunctions() {
        window.TianguisInsights = {
            buildAnalytics,
            countTriangles,
            findShortestRoute,
            estimateEconomicImpact
        };
    }

    document.addEventListener("DOMContentLoaded", async () => {
        [
            "dataStatus",
            "dashboardError",
            "kpiMarkets",
            "kpiMarketsDetail",
            "kpiProducts",
            "kpiProductsDetail",
            "kpiBusinesses",
            "kpiBusinessesDetail",
            "kpiListedValue",
            "networkGraph",
            "networkEdges",
            "networkCycles",
            "strongestLink",
            "strongestLinkDetail",
            "routeOrigin",
            "routeDestination",
            "routeResult",
            "categoryChart",
            "dailyUnits",
            "dailyEstimate",
            "weeklyEstimate",
            "monthlyEstimate",
            "pricedProductsNote",
            "marketTableBody",
            "complaintTotal",
            "complaintTotalDetail",
            "complaintTopType",
            "complaintTopTypeDetail",
            "complaintTopMarket",
            "complaintTopMarketDetail",
            "complaintTypeChart",
            "complaintMarketTable",
            "updatedAt"
        ].forEach(id => {
            elements[id] = document.getElementById(id);
        });

        exposeAnalyticsFunctions();
        elements.routeOrigin.addEventListener("change", updateRoute);
        elements.routeDestination.addEventListener("change", updateRoute);
        elements.dailyUnits.addEventListener("input", renderEconomicEstimate);

        try {
            await API.ready;
            render();
        } catch (error) {
            showError(error);
        }
    });

    window.addEventListener("storage", event => {
        if (event.key !== "tianguis_database_v1" || !analytics) return;
        try {
            render();
        } catch (error) {
            showError(error);
        }
    });
})();