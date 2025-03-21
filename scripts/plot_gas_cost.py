import json
import matplotlib.pyplot as plt
import numpy as np
import os

def plot_governance_comparisons(data, price_data):
    voters = [5, 10, 20, 30, 40, 50]  # x-axis values
    
    # First plot: Three types of weighted majority costs
    weighted_normal = [int(data['WeightedMajorityController'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    weighted_token = [int(data['WeightedMajorityToken'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    weighted_vc = [int(data['WeightedMajorityVC'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    weighted_normal_price = [float(price_data['WeightedMajorityController'][str(v)]['totalProcessGas']) for v in voters]
    weighted_token_price = [float(price_data['WeightedMajorityToken'][str(v)]['totalProcessGas']) for v in voters]
    weighted_vc_price = [float(price_data['WeightedMajorityVC'][str(v)]['totalProcessGas']) for v in voters]
    
    x = np.arange(len(voters))
    width = 0.25
    
    fig, ax1 = plt.subplots(figsize=(12, 6))
    ax1.bar(x - width, weighted_normal, width, label='Weighted Majority', color='#2196F3')
    ax1.bar(x, weighted_token, width, label='Weighted Majority Token', color='#4CAF50')
    ax1.bar(x + width, weighted_vc, width, label='Weighted Majority VC', color='#FFC107')
    
    ax1.set_xlabel('Number of Voters')
    ax1.set_ylabel('Total Process Gas (millions)')
    ax1.set_title('Weighted Majority Governance Gas Costs Comparison')
    ax1.set_xticks(x)
    ax1.set_xticklabels(voters)
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    ax2 = ax1.twinx()
    ax2.plot(x, weighted_normal_price, marker='o', color='#2196F3', linestyle='dashed', label='Weighted Majority Controller (USD)')
    ax2.plot(x, weighted_token_price, marker='o', color='#4CAF50', linestyle='dashed', label='Weighted Majority Token (USD)')
    ax2.plot(x, weighted_vc_price, marker='o', color='#FFC107', linestyle='dashed', label='Weighted Majority VC (USD)')
    ax2.set_ylabel('Total Process Gas Cost (USD)')
    ax2.legend(loc='upper left')
    
    plt.savefig('visualizations/weighted_majority_comparison.png', dpi=300, bbox_inches='tight')
    plt.close()
    
    # Second plot: Time Limited vs NofM
    nofm_costs = [int(data['NofM'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    time_limited_costs = [int(data['TimeLimited'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    nofm_prices = [float(price_data['NofM'][str(v)]['totalProcessGas']) for v in voters]
    time_limited_prices = [float(price_data['TimeLimited'][str(v)]['totalProcessGas']) for v in voters]
    
    fig, ax1 = plt.subplots(figsize=(12, 6))
    ax1.bar(x - width/2, time_limited_costs, width, label='Time Limited', color='#FF5733')
    ax1.bar(x + width/2, nofm_costs, width, label='N of M', color='#33FF57')
    
    ax1.set_xlabel('Number of Voters')
    ax1.set_ylabel('Total Process Gas (millions)')
    ax1.set_title('Time Limited vs NofM Governance Gas Costs')
    ax1.set_xticks(x)
    ax1.set_xticklabels(voters)
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    ax2 = ax1.twinx()
    ax2.plot(x, time_limited_prices, marker='o', color='#FF5733', linestyle='dashed', label='Time Limited (USD)')
    ax2.plot(x, nofm_prices, marker='o', color='#33FF57', linestyle='dashed', label='N of M (USD)')
    ax2.set_ylabel('Total Process Gas Cost (USD)')
    ax2.legend(loc='upper left')
    
    plt.savefig('visualizations/time_nofm_comparison.png', dpi=300, bbox_inches='tight')
    plt.close()
    
    # Third plot: Independent Governance
    controllers = [10, 20, 40, 60, 80, 100]
    x_ind = np.arange(len(controllers))
    independent_costs = [int(data['Independent'][str(c)]['totalProcessGas']) / 1e6 for c in controllers]
    independent_prices = [float(price_data['Independent'][str(c)]['totalProcessGas']) for c in controllers]
    
    fig, ax1 = plt.subplots(figsize=(10, 6))
    bars = ax1.bar(x_ind, independent_costs, color='#9C27B0')
    
    ax1.set_xlabel('Number of Controllers')
    ax1.set_ylabel('Total Process Gas (millions)')
    ax1.set_title('Independent Governance Gas Costs')
    ax1.set_xticks(x_ind)
    ax1.set_xticklabels(controllers)
    ax1.grid(True, alpha=0.3)
    
    # Add value labels on bars
    for bar in bars:
        height = bar.get_height()
        ax1.text(bar.get_x() + bar.get_width()/2., height,
                f'{height:.2f}M', ha='center', va='bottom')
    
    ax2 = ax1.twinx()
    ax2.plot(x_ind, independent_prices, marker='o', color='#9C27B0', linestyle='dashed', label='Independent (USD)')
    ax2.set_ylabel('Total Process Gas Cost (USD)')
    ax2.legend(loc='upper left')
    
    plt.savefig('visualizations/independent_governance.png', dpi=300, bbox_inches='tight')
    plt.close()

    # Fourth plot: Weighted Majority Token vs VC
    fig, ax1 = plt.subplots(figsize=(12, 6))
    ax1.bar(x - width/2, weighted_token, width, label='Weighted Majority Token', color='#4CAF50')
    ax1.bar(x + width/2, weighted_vc, width, label='Weighted Majority VC', color='#FFC107')
    
    ax1.set_xlabel('Number of Voters')
    ax1.set_ylabel('Total Process Gas (millions)')
    ax1.set_title('Weighted Majority Token vs VC Gas Costs')
    ax1.set_xticks(x)
    ax1.set_xticklabels(voters)
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    ax2 = ax1.twinx()
    ax2.plot(x, weighted_token_price, marker='o', color='#4CAF50', linestyle='dashed', label='Weighted Majority Token (USD)')
    ax2.plot(x, weighted_vc_price, marker='o', color='#FFC107', linestyle='dashed', label='Weighted Majority VC (USD)')
    ax2.set_ylabel('Total Process Gas Cost (USD)')
    ax2.legend(loc='upper left')
    
    plt.savefig('visualizations/weighted_token_vs_vc.png', dpi=300, bbox_inches='tight')
    plt.close()

    # Fifth plot: Offchain
    offchain_normal = [int(data['OffChainController'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    offchain_token = [int(data['OffChainToken'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    offchain_vc = [int(data['OffChainVC'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    offchain_normal_price = [float(price_data['OffChainController'][str(v)]['totalProcessGas']) for v in voters]
    offchain_token_price = [float(price_data['OffChainToken'][str(v)]['totalProcessGas']) for v in voters]
    offchain_vc_price = [float(price_data['OffChainVC'][str(v)]['totalProcessGas']) for v in voters]
    
    fig, ax1 = plt.subplots(figsize=(12, 6))
    ax1.bar(x - width, offchain_normal, width, label='Offchain', color='#2196F3')
    ax1.bar(x, offchain_token, width, label='Offchain Token', color='#4CAF50')
    ax1.bar(x + width, offchain_vc, width, label='Offchain VC', color='#FFC107')
    
    ax1.set_xlabel('Number of Voters')
    ax1.set_ylabel('Total Process Gas (millions)')
    ax1.set_title('Offchain Governance Gas Costs Comparison')
    ax1.set_xticks(x)
    ax1.set_xticklabels(voters)
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    ax2 = ax1.twinx()
    ax2.plot(x, offchain_normal_price, marker='o', color='#2196F3', linestyle='dashed', label='Offchain Controller (USD)')
    ax2.plot(x, offchain_token_price, marker='o', color='#4CAF50', linestyle='dashed', label='Offchain Token (USD)')
    ax2.plot(x, offchain_vc_price, marker='o', color='#FFC107', linestyle='dashed', label='Offchain VC (USD)')
    ax2.set_ylabel('Total Process Gas Cost (USD)')
    ax2.legend(loc='upper left')
    
    plt.savefig('visualizations/offchain_comparison.png', dpi=300, bbox_inches='tight')
    plt.close()

    # Sixth plot: Offchain VC vs Token comparison
    # Get the data
    offchain_token = [int(data['OffChainToken'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    offchain_vc = [int(data['OffChainVC'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    offchain_token_price = [float(price_data['OffChainToken'][str(v)]['totalProcessGas']) for v in voters]
    offchain_vc_price = [float(price_data['OffChainVC'][str(v)]['totalProcessGas']) for v in voters]

    fig, ax1 = plt.subplots(figsize=(12, 6))

    # Plot bars
    ax1.bar(x - width/2, offchain_token, width, label='Offchain Token', color='#4CAF50')
    ax1.bar(x + width/2, offchain_vc, width, label='Offchain VC', color='#FFC107')

    ax1.set_xlabel('Number of Voters')
    ax1.set_ylabel('Total Process Gas (millions)')
    ax1.set_title('Offchain Token vs VC Gas Costs Comparison')
    ax1.set_xticks(x)
    ax1.set_xticklabels(voters)
    ax1.legend()
    ax1.grid(True, alpha=0.3)

    # Add the price lines on the secondary y-axis
    ax2 = ax1.twinx()
    ax2.plot(x, offchain_token_price, marker='o', color='#4CAF50', linestyle='dashed', label='Offchain Token (USD)')
    ax2.plot(x, offchain_vc_price, marker='o', color='#FFC107', linestyle='dashed', label='Offchain VC (USD)')
    ax2.set_ylabel('Total Process Gas Cost (USD)')
    ax2.legend(loc='upper left')

    plt.savefig('visualizations/offchain_token_vc_comparison.png', dpi=300, bbox_inches='tight')
    plt.close()

    # Seventh plot: Weighted Majority vs Offchain comparison

    width = 0.15  # Narrower width since we have 6 bars

    # Get Weighted Majority data
    weighted_normal = [int(data['WeightedMajorityController'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    weighted_token = [int(data['WeightedMajorityToken'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    weighted_vc = [int(data['WeightedMajorityVC'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    weighted_normal_price = [float(price_data['WeightedMajorityController'][str(v)]['totalProcessGas']) for v in voters]
    weighted_token_price = [float(price_data['WeightedMajorityToken'][str(v)]['totalProcessGas']) for v in voters]
    weighted_vc_price = [float(price_data['WeightedMajorityVC'][str(v)]['totalProcessGas']) for v in voters]

    # Get Offchain data
    offchain_normal = [int(data['OffChainController'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    offchain_token = [int(data['OffChainToken'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    offchain_vc = [int(data['OffChainVC'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    offchain_normal_price = [float(price_data['OffChainController'][str(v)]['totalProcessGas']) for v in voters]
    offchain_token_price = [float(price_data['OffChainToken'][str(v)]['totalProcessGas']) for v in voters]
    offchain_vc_price = [float(price_data['OffChainVC'][str(v)]['totalProcessGas']) for v in voters]

    fig, ax1 = plt.subplots(figsize=(15, 8))

    # Plot bars with modified positions
    ax1.bar(x - 2.5*width, weighted_normal, width, label='Weighted Majority Controller', color='#1976D2')
    ax1.bar(x - 1.5*width, offchain_normal, width, label='Offchain Controller', color='#2196F3')

    ax1.bar(x - 0.5*width, weighted_token, width, label='Weighted Majority Token', color='#2E7D32')
    ax1.bar(x + 0.5*width, offchain_token, width, label='Offchain Token', color='#4CAF50')

    ax1.bar(x + 1.5*width, weighted_vc, width, label='Weighted Majority VC', color='#FFA000')
    ax1.bar(x + 2.5*width, offchain_vc, width, label='Offchain VC', color='#FFC107')

    ax1.set_xlabel('Number of Voters')
    ax1.set_ylabel('Total Process Gas (millions)')
    ax1.set_title('Weighted Majority vs Offchain Governance Comparison')
    ax1.set_xticks(x)
    ax1.set_xticklabels(voters)
    ax1.legend(loc='upper left')
    ax1.grid(True, alpha=0.3)

    # Add the price lines on the secondary y-axis
    ax2 = ax1.twinx()

    # Controller price lines
    ax2.plot(x, weighted_normal_price, marker='o', color='#1976D2', linestyle='dashed', label='Weighted Majority Controller (USD)')
    ax2.plot(x, offchain_normal_price, marker='s', color='#2196F3', linestyle='dashed', label='Offchain Controller (USD)')


    # Token price lines
    ax2.plot(x, weighted_token_price, marker='o', color='#2E7D32', linestyle='dashed', label='Weighted Majority Token (USD)')
    ax2.plot(x, offchain_token_price, marker='s', color='#4CAF50', linestyle='dashed', label='Offchain Token (USD)')

    # VC price lines
    ax2.plot(x, weighted_vc_price, marker='o', color='#FFA000', linestyle='dashed', label='Weighted Majority VC (USD)')
    ax2.plot(x, offchain_vc_price, marker='s', color='#FFC107', linestyle='dashed', label='Offchain VC (USD)')

    ax2.set_ylabel('Total Process Gas Cost (USD)')
    ax2.legend(bbox_to_anchor=(0, 0.65), loc='center left')

    # Adjust layout to prevent label cutoff
    plt.subplots_adjust(right=0.85)

    plt.savefig('visualizations/weighted_offchain_comparison.png', dpi=300, bbox_inches='tight')
    plt.close()

   # Eighth plot (unified version): Comprehensive comparison
    voters = [10, 20, 30, 40]  # Selected voter numbers
    controllers = [20, 40, 60, 80]  # Corresponding controller numbers (doubled)
    x = np.arange(len(voters))
    width = 0.1  # Slightly narrower to accommodate spacing

    # Get all data
    weighted_normal = [int(data['WeightedMajorityController'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    weighted_token = [int(data['WeightedMajorityToken'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    weighted_vc = [int(data['WeightedMajorityVC'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    #weighted_normal_price = [float(price_data['WeightedMajorityController'][str(v)]['totalProcessGas']) for v in voters]
    #weighted_token_price = [float(price_data['WeightedMajorityToken'][str(v)]['totalProcessGas']) for v in voters]
    #weighted_vc_price = [float(price_data['WeightedMajorityVC'][str(v)]['totalProcessGas']) for v in voters]

    offchain_normal = [int(data['OffChainController'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    offchain_token = [int(data['OffChainToken'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    offchain_vc = [int(data['OffChainVC'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    #offchain_normal_price = [float(price_data['OffChainController'][str(v)]['totalProcessGas']) for v in voters]
    #offchain_token_price = [float(price_data['OffChainToken'][str(v)]['totalProcessGas']) for v in voters]
    #offchain_vc_price = [float(price_data['OffChainVC'][str(v)]['totalProcessGas']) for v in voters]

    nofm = [int(data['NofM'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    #nofm_price = [float(price_data['NofM'][str(v)]['totalProcessGas']) for v in voters]

    independent = [int(data['Independent'][str(c)]['totalProcessGas']) / 1e6 for c in controllers]
    #independent_price = [float(price_data['Independent'][str(c)]['totalProcessGas']) for c in controllers]

    fig, ax1 = plt.subplots(figsize=(15, 8))

    # Add a light gray vertical line to separate Independent
    for i in x:
        ax1.axvline(x=i + 0.35, color='#E0E0E0', linestyle='-', zorder=1)

    # Group 1: Weighted Majority (Blues)
    ax1.bar(x - 3.5*width, weighted_normal, width, label='Weighted Majority Controller', color='#1976D2', zorder=2)
    ax1.bar(x - 2.5*width, weighted_token, width, label='Weighted Majority Token', color='#2196F3', zorder=2)
    ax1.bar(x - 1.5*width, weighted_vc, width, label='Weighted Majority VC', color='#64B5F6', zorder=2)

    # Group 2: Offchain (Greens)
    ax1.bar(x - 0.5*width, offchain_normal, width, label='Offchain Controller', color='#2E7D32', zorder=2)
    ax1.bar(x + 0.5*width, offchain_token, width, label='Offchain Token', color='#4CAF50', zorder=2)
    ax1.bar(x + 1.5*width, offchain_vc, width, label='Offchain VC', color='#81C784', zorder=2)

    # N of M (Purple)
    ax1.bar(x + 2.5*width, nofm, width, label='N of M Controller', color='#9C27B0', zorder=2)

    # Independent (Orange) - separated by small gap
    ax1.bar(x + 4.5*width, independent, width, label='Independent Controller', color='#FF9800', zorder=2)

    # Add a note about Independent governance
    #ax1.text(0.98, 1.02, '*Independent values shown for {2x} controllers (no voting required)', 
    #        transform=ax1.transAxes, fontsize=9, ha='right', style='italic')

    ax1.set_xlabel('Number of Voters (Controllers for Independent)', labelpad=10)
    ax1.set_ylabel('Total Process Gas (millions)')
    ax1.set_title('Comprehensive Governance Implementation Comparison')

    # Create double x-axis labels
    ax1.set_xticks(x)
    ax1.set_xticklabels([f'{v}\n({c})' for v, c in zip(voters, controllers)])

    ax1.legend(bbox_to_anchor=(0, 1), loc='upper left')
    ax1.grid(True, alpha=0.3)

    # Add the price lines on the secondary y-axis
    #ax2 = ax1.twinx()

    # Weighted Majority price lines (Blues)
    #ax2.plot(x, weighted_normal_price, marker='o', color='#1976D2', linestyle='dashed', label='Weighted Majority (USD)')
    #ax2.plot(x, weighted_token_price, marker='o', color='#2196F3', linestyle='dashed', label='Weighted Majority Token (USD)')
    #ax2.plot(x, weighted_vc_price, marker='o', color='#64B5F6', linestyle='dashed', label='Weighted Majority VC (USD)')

    # Offchain price lines (Greens)
    #ax2.plot(x, offchain_normal_price, marker='s', color='#2E7D32', linestyle='dashed', label='Offchain Controller (USD)')
    #ax2.plot(x, offchain_token_price, marker='s', color='#4CAF50', linestyle='dashed', label='Offchain Token (USD)')
    #ax2.plot(x, offchain_vc_price, marker='s', color='#81C784', linestyle='dashed', label='Offchain VC (USD)')

    # N of M price line (Purple)
    #ax2.plot(x, nofm_price, marker='^', color='#9C27B0', linestyle='dashed', label='N of M (USD)')

    # Independent price line (Orange)
    #ax2.plot(x, independent_price, marker='D', color='#FF9800', linestyle='dashed', label='Independent (USD)')

    #ax2.set_ylabel('Total Process Gas Cost (USD)')
    #ax2.legend(bbox_to_anchor=(1.15, 0.6), loc='center left')

    # Adjust layout
    plt.subplots_adjust(right=0.85)

    plt.savefig('visualizations/comprehensive_comparison_unified.png', dpi=300, bbox_inches='tight')
    plt.close()

    # Ninth plot (corrected): Eight governance methods comparison
    voters = [10, 20, 30, 40]  # Selected voter numbers
    x = np.arange(len(voters))
    width = 0.1  # Adjusted width for 8 bars

    # Get all data
    weighted_normal = [int(data['WeightedMajorityController'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    weighted_token = [int(data['WeightedMajorityToken'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    weighted_vc = [int(data['WeightedMajorityVC'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    #weighted_normal_price = [float(price_data['WeightedMajorityController'][str(v)]['totalProcessGas']) for v in voters]
    #weighted_token_price = [float(price_data['WeightedMajorityToken'][str(v)]['totalProcessGas']) for v in voters]
    #weighted_vc_price = [float(price_data['WeightedMajorityVC'][str(v)]['totalProcessGas']) for v in voters]

    offchain_normal = [int(data['OffChainController'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    offchain_token = [int(data['OffChainToken'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    offchain_vc = [int(data['OffChainVC'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    #offchain_normal_price = [float(price_data['OffChainController'][str(v)]['totalProcessGas']) for v in voters]
    #offchain_token_price = [float(price_data['OffChainToken'][str(v)]['totalProcessGas']) for v in voters]
    #offchain_vc_price = [float(price_data['OffChainVC'][str(v)]['totalProcessGas']) for v in voters]

    time_limited = [int(data['TimeLimited'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    #time_limited_price = [float(price_data['TimeLimited'][str(v)]['totalProcessGas']) for v in voters]

    nofm = [int(data['NofM'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    #nofm_price = [float(price_data['NofM'][str(v)]['totalProcessGas']) for v in voters]

    fig, ax1 = plt.subplots(figsize=(15, 8))

    # Group 1: Weighted Majority (Blues)
    ax1.bar(x - 3.5*width, weighted_normal, width, label='Weighted Majority Controller', color='#1976D2')
    ax1.bar(x - 2.5*width, weighted_token, width, label='Weighted Majority Token', color='#2196F3')
    ax1.bar(x - 1.5*width, weighted_vc, width, label='Weighted Majority VC', color='#64B5F6')

    # Group 2: Offchain (Greens)
    ax1.bar(x - 0.5*width, offchain_normal, width, label='Offchain Controller', color='#2E7D32')
    ax1.bar(x + 0.5*width, offchain_token, width, label='Offchain Token', color='#4CAF50')
    ax1.bar(x + 1.5*width, offchain_vc, width, label='Offchain VC', color='#81C784')

    # Time Limited (Red) and N of M (Purple)
    ax1.bar(x + 2.5*width, time_limited, width, label='Time Limited Controller', color='#D32F2F')
    ax1.bar(x + 3.5*width, nofm, width, label='N of M Controller', color='#9C27B0')

    ax1.set_xlabel('Number of Voters')
    ax1.set_ylabel('Total Process Gas (millions)')
    ax1.set_title('Governance Implementation Comparison')
    ax1.set_xticks(x)
    ax1.set_xticklabels(voters)
    ax1.legend(bbox_to_anchor=(0, 1), loc='upper left')
    ax1.grid(True, alpha=0.3)

    # Add the price lines on the secondary y-axis
    #ax2 = ax1.twinx()

    # Weighted Majority price lines (Blues)
    #ax2.plot(x, weighted_normal_price, marker='o', color='#1976D2', linestyle='dashed', label='Weighted Majority (USD)')
    #ax2.plot(x, weighted_token_price, marker='o', color='#2196F3', linestyle='dashed', label='Weighted Majority Token (USD)')
    #ax2.plot(x, weighted_vc_price, marker='o', color='#64B5F6', linestyle='dashed', label='Weighted Majority VC (USD)')

    # Offchain price lines (Greens)
    #ax2.plot(x, offchain_normal_price, marker='s', color='#2E7D32', linestyle='dashed', label='Offchain Controller (USD)')
    #ax2.plot(x, offchain_token_price, marker='s', color='#4CAF50', linestyle='dashed', label='Offchain Token (USD)')
    #ax2.plot(x, offchain_vc_price, marker='s', color='#81C784', linestyle='dashed', label='Offchain VC (USD)')

    # Time Limited (Red) and N of M (Purple) price lines
    #ax2.plot(x, time_limited_price, marker='^', color='#D32F2F', linestyle='dashed', label='Time Limited (USD)')
    #ax2.plot(x, nofm_price, marker='^', color='#9C27B0', linestyle='dashed', label='N of M (USD)')

    #ax2.set_ylabel('Total Process Gas Cost (USD)')
    #ax2.legend(bbox_to_anchor=(1.15, 0.6), loc='center left')

    # Adjust layout
    plt.subplots_adjust(right=0.85)

    plt.savefig('visualizations/eight_governance_comparison.png', dpi=300, bbox_inches='tight')
    plt.close()

    # Ninth plot (alternative grouping): Eight governance methods comparison
    voters = [10, 20, 30, 40]  # Selected voter numbers
    x = np.arange(len(voters))
    width = 0.1  # Width for 8 bars

    # Get all data - grouped by implementation type
    # Controller-based implementations
    weighted_controller = [int(data['WeightedMajorityController'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    offchain_controller = [int(data['OffChainController'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    nofm = [int(data['NofM'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    time_limited = [int(data['TimeLimited'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    #weighted_controller_price = [float(price_data['WeightedMajorityController'][str(v)]['totalProcessGas']) for v in voters]
    #offchain_controller_price = [float(price_data['OffChainController'][str(v)]['totalProcessGas']) for v in voters]
    #nofm_price = [float(price_data['NofM'][str(v)]['totalProcessGas']) for v in voters]
    #time_limited_price = [float(price_data['TimeLimited'][str(v)]['totalProcessGas']) for v in voters]

    # Token-based implementations
    weighted_token = [int(data['WeightedMajorityToken'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    offchain_token = [int(data['OffChainToken'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    #weighted_token_price = [float(price_data['WeightedMajorityToken'][str(v)]['totalProcessGas']) for v in voters]
    #offchain_token_price = [float(price_data['OffChainToken'][str(v)]['totalProcessGas']) for v in voters]

    # VC-based implementations
    weighted_vc = [int(data['WeightedMajorityVC'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    offchain_vc = [int(data['OffChainVC'][str(v)]['totalProcessGas']) / 1e6 for v in voters]
    #weighted_vc_price = [float(price_data['WeightedMajorityVC'][str(v)]['totalProcessGas']) for v in voters]
    #offchain_vc_price = [float(price_data['OffChainVC'][str(v)]['totalProcessGas']) for v in voters]

    fig, ax1 = plt.subplots(figsize=(15, 8))

    # Group 1: Controller-based (Blues/Purples)
    ax1.bar(x - 3.5*width, weighted_controller, width, label='Weighted Majority Controller', color='#1976D2')
    ax1.bar(x - 2.5*width, offchain_controller, width, label='Offchain Controller', color='#2196F3')
    ax1.bar(x - 1.5*width, time_limited, width, label='Time Limited Controller', color='#D32F2F')
    ax1.bar(x - 0.5*width, nofm, width, label='N of M Controller', color='#9C27B0')


    # Group 2: Token-based (Greens)
    ax1.bar(x + 0.5*width, weighted_token, width, label='Weighted Majority Token', color='#2E7D32')
    ax1.bar(x + 1.5*width, offchain_token, width, label='Offchain Token', color='#4CAF50')

    # Group 3: VC-based (Oranges)
    ax1.bar(x + 2.5*width, weighted_vc, width, label='Weighted Majority VC', color='#FF9800')
    ax1.bar(x + 3.5*width, offchain_vc, width, label='Offchain VC', color='#FFA726')

    ax1.set_xlabel('Number of Voters')
    ax1.set_ylabel('Total Process Gas (millions)')
    ax1.set_title('Governance Implementation Comparison (Grouped by Architecture)')
    ax1.set_xticks(x)
    ax1.set_xticklabels(voters)
    ax1.legend(bbox_to_anchor=(0, 1), loc='upper left')
    ax1.grid(True, alpha=0.3)

    # Add the price lines on the secondary y-axis
    #ax2 = ax1.twinx()

    # Controller-based price lines (Blues/Purples)
    #ax2.plot(x, weighted_controller_price, marker='o', color='#1976D2', linestyle='dashed', label='Weighted Majority Controller (USD)')
    #ax2.plot(x, offchain_controller_price, marker='o', color='#2196F3', linestyle='dashed', label='Offchain Controller (USD)')
    #ax2.plot(x, nofm_price, marker='o', color='#9C27B0', linestyle='dashed', label='N of M (USD)')
    #ax2.plot(x, time_limited_price, marker='o', color='#D32F2F', linestyle='dashed', label='Time Limited (USD)')

    # Token-based price lines (Greens)
    #ax2.plot(x, weighted_token_price, marker='s', color='#2E7D32', linestyle='dashed', label='Weighted Majority Token (USD)')
    #ax2.plot(x, offchain_token_price, marker='s', color='#4CAF50', linestyle='dashed', label='Offchain Token (USD)')

    # VC-based price lines (Oranges)
    #ax2.plot(x, weighted_vc_price, marker='^', color='#FF9800', linestyle='dashed', label='Weighted Majority VC (USD)')
    #ax2.plot(x, offchain_vc_price, marker='^', color='#FFA726', linestyle='dashed', label='Offchain VC (USD)')

    #ax2.set_ylabel('Total Process Gas Cost (USD)')
    #ax2.legend(bbox_to_anchor=(1.15, 0.6), loc='center left')

    # Add subtle vertical separators between groups
    for i in x:
        ax1.axvline(x=i - 1.0*width, color='#E0E0E0', linestyle='-', alpha=0.3, zorder=1)
        ax1.axvline(x=i + 2.0*width, color='#E0E0E0', linestyle='-', alpha=0.3, zorder=1)

    # Adjust layout
    plt.subplots_adjust(right=0.85)

    plt.savefig('visualizations/eight_governance_comparison_regrouped.png', dpi=300, bbox_inches='tight')
    plt.close()

# Get the directory of the current script
script_dir = os.path.dirname(os.path.abspath(__file__))
# Get the project root directory (parent of scripts directory)
project_root = os.path.dirname(script_dir)
# Path to test results
test_results_path = os.path.join(project_root, 'test', 'test_results.json')
price_results_path = os.path.join(project_root, 'test', 'price_test.json')

# Read the JSON data
with open(test_results_path, 'r') as f:
    data = json.load(f)
with open(price_results_path, 'r') as f:
    price_data = json.load(f)

# Generate plots
plot_governance_comparisons(data, price_data)