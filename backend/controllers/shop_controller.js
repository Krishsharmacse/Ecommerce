import { Shop } from "../models/shop_model.js";
import { User } from "../models/user_model.js";
import { Product } from "../models/product_model.js";
import { Order } from "../models/order_model.js";

// ════════════════════════════════════════════════════════════
// MANAGER: Create a shop (requires owner approval)
// ════════════════════════════════════════════════════════════
export const createShop = async (req, res) => {
    try {
        const { name, description, category, email, phone, address } = req.body;

        if (!name || !category) {
            return res.status(400).json({ success: false, message: "Shop name and category are required." });
        }

        // One manager → one shop
        const existingShop = await Shop.findOne({ ownerId: req.user._id });
        if (existingShop) {
            return res.status(400).json({ success: false, message: "You already have a shop." });
        }

        const shop = await Shop.create({
            name: name.trim(),
            description: description?.trim() || "",
            category: category.trim(),
            email: email?.trim() || "",
            phone: phone?.trim() || "",
            address: address?.trim() || "",
            ownerId: req.user._id,
            status: "pending",  // Owner must approve
        });

        // Link shop to user
        await User.findByIdAndUpdate(req.user._id, { shopId: shop._id });

        return res.status(201).json({
            success: true,
            message: "Shop created! It is pending approval from the owner.",
            shop,
        });
    } catch (error) {
        console.error("createShop error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// SHOPKEEPER: Request to open a shop (creates pending shop)
// ════════════════════════════════════════════════════════════
export const createShopRequest = async (req, res) => {
    try {
        const { name, description, category, email, phone, address } = req.body;

        if (req.user.role !== "shopkeeper") {
            return res.status(403).json({ success: false, message: "Only shopkeepers may request a new shop via this endpoint." });
        }

        if (!name || !category) {
            return res.status(400).json({ success: false, message: "Shop name and category are required." });
        }

        // Prevent multiple pending/active shops for same user
        const existing = await Shop.findOne({ ownerId: req.user._id, status: { $in: ["pending", "approved"] } });
        if (existing) return res.status(400).json({ success: false, message: "You already have or requested a shop." });

        const shop = await Shop.create({
            name: name.trim(),
            description: description?.trim() || "",
            category: category.trim(),
            email: email?.trim() || "",
            phone: phone?.trim() || "",
            address: address?.trim() || "",
            ownerId: req.user._id,
            requestedBy: req.user._id,
            status: "pending",
        });

        // Link request to user (optional)
        await User.findByIdAndUpdate(req.user._id, { shopId: shop._id });

        return res.status(201).json({ success: true, message: "Shop request submitted and pending approval.", shop });
    } catch (error) {
        console.error("createShopRequest error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// PUBLIC: Get all approved shops
// ════════════════════════════════════════════════════════════
export const getAllShops = async (req, res) => {
    try {
        const { page = 1, limit = 20, category, search } = req.query;

        const filter = { status: "approved", isActive: true };
        if (category) filter.category = { $regex: category, $options: "i" };
        if (search) filter.name = { $regex: search, $options: "i" };

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [shops, total] = await Promise.all([
            Shop.find(filter)
                .populate("ownerId", "firstname lastname email")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Shop.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            shops,
            pagination: { page: parseInt(page), total, pages: Math.ceil(total / parseInt(limit)) }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// PUBLIC: Get shop by ID with its products
// ════════════════════════════════════════════════════════════
export const getShopById = async (req, res) => {
    try {
        const shop = await Shop.findById(req.params.shopId)
            .populate("ownerId", "firstname lastname email");

        if (!shop) return res.status(404).json({ success: false, message: "Shop not found." });

        const products = await Product.find({ shopId: shop._id, isActive: true }).limit(20);

        return res.status(200).json({ success: true, shop, products });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// MANAGER: Get own shop dashboard
// ════════════════════════════════════════════════════════════
export const getMyShop = async (req, res) => {
    try {
        const shop = await Shop.findOne({ ownerId: req.user._id });
        if (!shop) {
            return res.status(404).json({ success: false, message: "You don't have a shop yet." });
        }

        const [products, recentOrders] = await Promise.all([
            Product.find({ shopId: shop._id }),
            Order.find({ "items.shopId": shop._id })
                .populate("userId", "firstname lastname email")
                .sort({ createdAt: -1 })
                .limit(10),
        ]);

        return res.status(200).json({ success: true, shop, products, recentOrders });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// MANAGER: Update own shop
// ════════════════════════════════════════════════════════════
export const updateMyShop = async (req, res) => {
    try {
        const shop = await Shop.findOne({ ownerId: req.user._id });
        if (!shop) return res.status(404).json({ success: false, message: "Shop not found." });

        const { name, description, category, email, phone, address, logo, banner } = req.body;

        if (name) shop.name = name.trim();
        if (description !== undefined) shop.description = description.trim();
        if (category) shop.category = category.trim();
        if (email !== undefined) shop.email = email.trim();
        if (phone !== undefined) shop.phone = phone.trim();
        if (address !== undefined) shop.address = address.trim();
        if (logo !== undefined) shop.logo = logo;
        if (banner !== undefined) shop.banner = banner;

        await shop.save();

        return res.status(200).json({ success: true, message: "Shop updated.", shop });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// MANAGER: Get sales analytics for own shop
// ════════════════════════════════════════════════════════════
export const getMyShopSales = async (req, res) => {
    try {
        const shop = await Shop.findOne({ ownerId: req.user._id });
        if (!shop) return res.status(404).json({ success: false, message: "Shop not found." });

        const { days = 30 } = req.query;
        const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

        const orders = await Order.find({
            "items.shopId": shop._id,
            createdAt: { $gte: since },
        }).populate("userId", "firstname email");

        // Aggregate revenue by day
        const dailyRevMap = {};
        let totalRevenue = 0;
        let totalOrders = 0;

        orders.forEach(order => {
            const shopItems = order.items.filter(i => i.shopId?.toString() === shop._id.toString());
            const shopRevenue = shopItems.reduce((sum, i) => sum + i.totalPrice, 0);
            const day = order.createdAt.toISOString().split("T")[0];
            dailyRevMap[day] = (dailyRevMap[day] || 0) + shopRevenue;
            totalRevenue += shopRevenue;
            totalOrders++;
        });

        // Top products
        const productSales = {};
        orders.forEach(order => {
            order.items
                .filter(i => i.shopId?.toString() === shop._id.toString())
                .forEach(item => {
                    if (!productSales[item.productId]) {
                        productSales[item.productId] = { name: item.name, sold: 0, revenue: 0 };
                    }
                    productSales[item.productId].sold += item.quantity;
                    productSales[item.productId].revenue += item.totalPrice;
                });
        });

        const topProducts = Object.values(productSales)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        const chartData = Object.entries(dailyRevMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, revenue]) => ({ date, revenue }));

        return res.status(200).json({
            success: true,
            analytics: {
                totalRevenue,
                totalOrders,
                totalProducts: await Product.countDocuments({ shopId: shop._id }),
                topProducts,
                chartData,
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// OWNER: Get all shops (including pending)
// ════════════════════════════════════════════════════════════
export const getAllShopsAdmin = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [shops, total] = await Promise.all([
            Shop.find(filter)
                .populate("ownerId", "firstname lastname email role")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Shop.countDocuments(filter),
        ]);

        return res.status(200).json({ success: true, shops, pagination: { page: parseInt(page), total, pages: Math.ceil(total / parseInt(limit)) } });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// OWNER: Approve / suspend shop
// ════════════════════════════════════════════════════════════
export const updateShopStatus = async (req, res) => {
    try {
        const { shopId } = req.params;
        const { status, note } = req.body;

        const validStatuses = ["approved", "suspended", "rejected", "pending"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status." });
        }

        const shop = await Shop.findById(shopId);
        if (!shop) return res.status(404).json({ success: false, message: "Shop not found." });

        // If a manager (not owner) approves, transfer ownership to manager and approve the requester
        const isManagerLevel = req.user.role === "manager" || req.user.role === "owner" || req.user.role === "admin";

        // Only owner or approved manager may change status (route middleware will usually enforce this)
        shop.status = status;
        shop.statusUpdatedBy = req.user._id;
        shop.statusUpdatedAt = new Date();
        shop.statusNote = note || "";

        if (status === "approved" && req.user.role === "manager") {
            // Make the manager the owner of the shop (they manage the store)
            shop.ownerId = req.user._id;

            // If this shop was requested by a shopkeeper, assign and approve them
            if (shop.requestedBy) {
                try {
                    await User.findByIdAndUpdate(shop.requestedBy, {
                        shopId: shop._id,
                        isShopkeeperApproved: true,
                        shopkeeperApprovedBy: req.user._id,
                        shopkeeperApprovedAt: new Date()
                    });
                } catch (uErr) {
                    console.warn("Failed to auto-assign requested shopkeeper:", uErr.message);
                }
            }
        }

        await shop.save();

        return res.status(200).json({ success: true, message: `Shop ${status}.`, shop });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// OWNER: Platform-wide sales analytics
// ════════════════════════════════════════════════════════════
export const getPlatformSales = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

        const [totalShops, approvedShops, totalOrders, recentOrders, topShops] = await Promise.all([
            Shop.countDocuments(),
            Shop.countDocuments({ status: "approved" }),
            Order.countDocuments({ createdAt: { $gte: since } }),
            Order.find({ createdAt: { $gte: since } })
                .select("totalAmount status createdAt")
                .sort({ createdAt: -1 })
                .limit(50),
            Shop.find({ status: "approved" })
                .sort({ totalRevenue: -1 })
                .limit(5)
                .populate("ownerId", "firstname email"),
        ]);

        const totalRevenue = recentOrders.reduce((sum, o) => sum + o.totalAmount, 0);

        return res.status(200).json({
            success: true,
            analytics: {
                totalShops,
                approvedShops,
                totalOrders,
                totalRevenue,
                topShops,
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// SHOPKEEPER: Get their assigned shop + products + recent orders
// ════════════════════════════════════════════════════════════
export const getMyAssignedShop = async (req, res) => {
    try {
        const { role, shopId: userShopId } = req.user;
        const isManagerLevel = role === "manager" || role === "owner" || role === "admin";
        const shopQuery = isManagerLevel ? { ownerId: req.user._id } : { _id: userShopId };

        const shop = await Shop.findOne(shopQuery).populate("ownerId", "firstname lastname email");
        if (!shop) {
            return res.status(404).json({ success: false, message: "No shop assigned. Ask your manager to assign you to a shop." });
        }

        const [products, recentOrders] = await Promise.all([
            Product.find({ shopId: shop._id }).sort({ createdAt: -1 }),
            Order.find({ "items.shopId": shop._id })
                .populate("userId", "firstname email")
                .sort({ createdAt: -1 })
                .limit(10),
        ]);

        return res.status(200).json({ success: true, shop, products, recentOrders });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// SHOPKEEPER: Toggle shop LIVE / OFFLINE (isActive)
// ════════════════════════════════════════════════════════════
export const toggleShopLive = async (req, res) => {
    try {
        const { role, shopId: userShopId } = req.user;
        const isManagerLevel = role === "manager" || role === "owner" || role === "admin";
        const shopQuery = isManagerLevel ? { ownerId: req.user._id } : { _id: userShopId };

        const shop = await Shop.findOne(shopQuery);
        if (!shop) return res.status(404).json({ success: false, message: "Shop not found." });

        if (shop.status !== "approved") {
            return res.status(403).json({ success: false, message: "Shop must be approved before you can go live." });
        }

        shop.isActive = !shop.isActive;
        await shop.save();

        return res.status(200).json({
            success: true,
            message: shop.isActive ? "🟢 Shop is now LIVE!" : "🔴 Shop is now OFFLINE.",
            isActive: shop.isActive,
            shop,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// SHOPKEEPER: View revenue / analytics of their shop
// ════════════════════════════════════════════════════════════
export const getMyAssignedShopSales = async (req, res) => {
    try {
        const { role, shopId: userShopId } = req.user;
        const isManagerLevel = role === "manager" || role === "owner" || role === "admin";

        const shop = await Shop.findOne(isManagerLevel ? { ownerId: req.user._id } : { _id: userShopId });
        if (!shop) return res.status(404).json({ success: false, message: "Shop not found." });

        const { days = 30 } = req.query;
        const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

        const orders = await Order.find({ "items.shopId": shop._id, createdAt: { $gte: since } });

        const dailyRevMap = {};
        let totalRevenue = 0;
        const productSales = {};

        orders.forEach(order => {
            const shopItems = order.items.filter(i => i.shopId?.toString() === shop._id.toString());
            const shopRevenue = shopItems.reduce((sum, i) => sum + i.totalPrice, 0);
            const day = order.createdAt.toISOString().split("T")[0];
            dailyRevMap[day] = (dailyRevMap[day] || 0) + shopRevenue;
            totalRevenue += shopRevenue;
            shopItems.forEach(item => {
                if (!productSales[item.productId]) productSales[item.productId] = { name: item.name, sold: 0, revenue: 0 };
                productSales[item.productId].sold += item.quantity;
                productSales[item.productId].revenue += item.totalPrice;
            });
        });

        const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
        const chartData = Object.entries(dailyRevMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, revenue]) => ({ date, revenue }));

        return res.status(200).json({
            success: true,
            analytics: {
                totalRevenue, totalOrders: orders.length,
                totalProducts: await Product.countDocuments({ shopId: shop._id }),
                topProducts, chartData,
                shopName: shop.name,
                isLive: shop.isActive,
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// MANAGER: Approve / remove a shopkeeper from their shop
// ════════════════════════════════════════════════════════════
export const assignShopkeeper = async (req, res) => {
    try {
        const { userId, action } = req.body;
        if (!userId || !action) return res.status(400).json({ success: false, message: "userId and action required." });

        const shop = await Shop.findOne({ ownerId: req.user._id });
        const shopId = shop?._id || req.body.shopId;

        const sk = await User.findById(userId);
        if (!sk) return res.status(404).json({ success: false, message: "User not found." });
        if (sk.role !== "shopkeeper") return res.status(400).json({ success: false, message: "User must have the 'shopkeeper' role." });

        if (action === "approve") {
            sk.isShopkeeperApproved = true;
            sk.shopkeeperApprovedAt = new Date();
            sk.shopkeeperApprovedBy = req.user._id;
            sk.shopId = shopId;
            await sk.save();
            return res.status(200).json({ success: true, message: "Shopkeeper approved and assigned to your shop." });
        }
        if (action === "remove") {
            sk.isShopkeeperApproved = false;
            sk.shopkeeperApprovedAt = null;
            sk.shopkeeperApprovedBy = null;
            sk.shopId = null;
            await sk.save();
            return res.status(200).json({ success: true, message: "Shopkeeper removed from shop." });
        }
        return res.status(400).json({ success: false, message: "action must be 'approve' or 'remove'." });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// MANAGER: List all shopkeepers assigned to their shop
// ════════════════════════════════════════════════════════════
export const getMyShopkeepers = async (req, res) => {
    try {
        const shop = await Shop.findOne({ ownerId: req.user._id });
        const shopId = shop?._id || req.query.shopId;
        if (!shopId) return res.status(404).json({ success: false, message: "Shop not found." });

        const shopkeepers = await User.find({ role: "shopkeeper", shopId })
            .select("firstname lastname email isShopkeeperApproved shopkeeperApprovedAt createdAt");

        return res.status(200).json({ success: true, shopkeepers });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
