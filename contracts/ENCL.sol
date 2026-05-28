// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.17;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title ENCL
 * @notice The ENCLAVES platform utility / bonding token. A standard ERC-20
 *         (with EIP-2612 permit) with a fixed supply that is minted in full
 *         to the `treasury` at deployment.
 *
 *         ENCL is consumed by the StakingBond contract (in the enclaves/rwa
 *         package) as the collateral every issuer must lock up before any
 *         real-world-asset token under their Enclave can mint. ENCL itself is
 *         intentionally **not** ERC-3643: it is freely transferable, has no
 *         pause / freeze / blacklist, no upgrade path and no mint capability
 *         beyond the deployment-time supply.
 *
 *         Constraints enforced here:
 *           - treasury must not be the zero address
 *           - total supply is determined at deployment and never grows
 *           - circulating supply can only ever *shrink* through transfers to
 *             slash receivers in StakingBond.slash()
 *
 *         Deploying it lives in its own repository so the bonding token can
 *         be governed, audited and upgraded (via address rotation) on a
 *         schedule independent of the RWA contracts.
 */
contract ENCL is ERC20, ERC20Permit {
    constructor(address treasury, uint256 totalSupply_)
        ERC20("Enclaves", "ENCL")
        ERC20Permit("Enclaves")
    {
        require(treasury != address(0), "bad treasury");
        _mint(treasury, totalSupply_);
    }
}
